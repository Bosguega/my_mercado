import { beforeEach, describe, expect, it, vi } from "vitest";

import { mergeCanonicalProducts } from "./canonicalProductService";
import { getUserOrThrow, requireSupabase } from "./authService";

vi.mock("./authService", () => ({
  getUserOrThrow: vi.fn(),
  requireSupabase: vi.fn(),
}));

type QueryResult<T = unknown> = Promise<{ data?: T; error: unknown; count?: number }>;

class MockQueryBuilder {
  private filters: Record<string, unknown> = {};
  private op: "select" | "update" | "delete" | null = null;
  private payload: Record<string, unknown> | null = null;

  constructor(
    private readonly table: string,
    private readonly state: {
      primaryId: string;
      secondaryId: string;
      userId: string;
      calls: Array<{ table: string; op: string; payload?: Record<string, unknown>; filters: Record<string, unknown> }>;
    },
  ) {}

  select() {
    this.op = "select";
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.op = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters[field] = value;
    return this;
  }

  in(field: string, values: unknown[]) {
    this.filters[field] = values;
    return this;
  }

  async single(): QueryResult<{
    id: string;
    name: string;
    category: string;
    merge_count: number;
  }> {
    if (this.table !== "canonical_products" || this.op !== "select") {
      return { error: null };
    }

    const id = String(this.filters.id || "");
    if (id === this.state.primaryId) {
      return {
        data: {
          id,
          name: "Produto Primario",
          category: "Bebidas",
          merge_count: 2,
        },
        error: null,
      };
    }
    if (id === this.state.secondaryId) {
      return {
        data: {
          id,
          name: "Produto Secundario",
          category: "Bebidas",
          merge_count: 1,
        },
        error: null,
      };
    }
    return { data: undefined, error: { code: "PGRST116" } };
  }

  then<TResult1 = { data?: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?: ((value: { data?: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    const response = this.execute();
    return response.then(onfulfilled, onrejected);
  }

  private execute(): Promise<{ data?: unknown; error: unknown }> {
    if (this.table === "receipts" && this.op === "select") {
      return Promise.resolve({
        data: [{ id: "receipt-1" }],
        error: null,
      });
    }

    this.state.calls.push({
      table: this.table,
      op: this.op || "unknown",
      payload: this.payload || undefined,
      filters: { ...this.filters },
    });

    return Promise.resolve({ error: null });
  }
}

function createSupabaseMock(primaryId: string, secondaryId: string, userId: string) {
  const state = {
    primaryId,
    secondaryId,
    userId,
    calls: [] as Array<{ table: string; op: string; payload?: Record<string, unknown>; filters: Record<string, unknown> }>,
  };

  return {
    state,
    client: {
      from: (table: string) => new MockQueryBuilder(table, state),
    },
  };
}

describe("mergeCanonicalProducts", () => {
  const userId = "user-1";
  const primaryId = "primary-1";
  const secondaryId = "secondary-1";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserOrThrow).mockResolvedValue({ 
      id: userId,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as any);
  });

  it("moves associations, updates merge_count and deletes secondary product", async () => {
    const mock = createSupabaseMock(primaryId, secondaryId, userId);
    vi.mocked(requireSupabase).mockReturnValue(mock.client as any);

    await mergeCanonicalProducts(primaryId, secondaryId);

    const calls = mock.state.calls;

    const updateItemsCall = calls.find(
      (c) => c.table === "items" && c.op === "update",
    );
    expect(updateItemsCall).toBeDefined();
    expect(updateItemsCall?.payload).toMatchObject({
      canonical_product_id: primaryId,
      normalized_name: "Produto Primario",
      category: "Bebidas",
    });
    expect(updateItemsCall?.filters.canonical_product_id).toBe(secondaryId);

    const updateDictionaryCall = calls.find(
      (c) => c.table === "product_dictionary" && c.op === "update",
    );
    expect(updateDictionaryCall).toBeDefined();
    expect(updateDictionaryCall?.payload).toMatchObject({
      canonical_product_id: primaryId,
      normalized_name: "Produto Primario",
      category: "Bebidas",
    });
    expect(updateDictionaryCall?.filters.canonical_product_id).toBe(secondaryId);

    const updatePrimaryCall = calls.find(
      (c) =>
        c.table === "canonical_products" &&
        c.op === "update" &&
        c.filters.id === primaryId &&
        c.filters.user_id === userId,
    );
    expect(updatePrimaryCall).toBeDefined();
    expect(updatePrimaryCall?.payload).toMatchObject({ merge_count: 3 });

    const deleteSecondaryCall = calls.find(
      (c) =>
        c.table === "canonical_products" &&
        c.op === "delete" &&
        c.filters.id === secondaryId &&
        c.filters.user_id === userId,
    );
    expect(deleteSecondaryCall).toBeDefined();
  });
});
