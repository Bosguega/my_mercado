import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { normalizeKey } from "../utils/normalize";
import type { ShoppingListItem } from "../types/ui";

const FALLBACK_OWNER_KEY = "__local__";

function getOwnerKey(userId: string | null | undefined): string {
  const trimmed = (userId || "").trim();
  return trimmed || FALLBACK_OWNER_KEY;
}

function createListItem(name: string, quantity?: string): ShoppingListItem {
  const now = new Date().toISOString();
  const rawId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  return {
    id: rawId,
    name: name.trim(),
    normalized_key: normalizeKey(name),
    quantity: quantity?.trim() || undefined,
    checked: false,
    created_at: now,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function coerceItem(raw: unknown): ShoppingListItem | null {
  if (!isRecord(raw)) return null;
  const name = String(raw.name || "").trim();
  if (!name) return null;

  const id = String(raw.id || "").trim() || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const normalized_key = String(raw.normalized_key || "").trim() || normalizeKey(name);

  return {
    id,
    name,
    normalized_key,
    quantity: raw.quantity ? String(raw.quantity).trim() : undefined,
    checked: Boolean(raw.checked),
    created_at: raw.created_at ? String(raw.created_at) : new Date().toISOString(),
    checked_at: raw.checked_at ? String(raw.checked_at) : undefined,
  };
}

function getUserItemsSafe(
  itemsByUser: unknown,
  userId: string | null | undefined,
): ShoppingListItem[] {
  if (!isRecord(itemsByUser)) return [];
  const ownerKey = getOwnerKey(userId);
  const rawItems = itemsByUser[ownerKey];
  if (!Array.isArray(rawItems)) return [];

  return rawItems
    .map((entry) => coerceItem(entry))
    .filter((entry): entry is ShoppingListItem => Boolean(entry));
}

type AddItemResult =
  | { ok: true; item: ShoppingListItem }
  | { ok: false; reason: "empty" | "duplicate" };

type ShoppingListState = {
  itemsByUser: Record<string, ShoppingListItem[]>;
  addItem: (
    userId: string | null | undefined,
    name: string,
    quantity?: string,
  ) => AddItemResult;
  toggleChecked: (userId: string | null | undefined, itemId: string) => void;
  removeItem: (userId: string | null | undefined, itemId: string) => void;
  clearChecked: (userId: string | null | undefined) => void;
  clearAll: (userId: string | null | undefined) => void;
};

export const useShoppingListStore = create<ShoppingListState>()(
  persist(
    (set, get) => ({
      itemsByUser: {},
      addItem: (userId, name, quantity) => {
        const trimmed = name.trim();
        if (!trimmed) return { ok: false, reason: "empty" };

        const ownerKey = getOwnerKey(userId);
        const normalized = normalizeKey(trimmed);
        const currentItems = getUserItemsSafe(get().itemsByUser, userId);
        const hasDuplicate = currentItems.some(
          (item) => item.normalized_key === normalized && !item.checked,
        );

        if (hasDuplicate) return { ok: false, reason: "duplicate" };

        const newItem = createListItem(trimmed, quantity);
        set((state) => ({
          itemsByUser: {
            ...(isRecord(state.itemsByUser) ? state.itemsByUser : {}),
            [ownerKey]: [newItem, ...getUserItemsSafe(state.itemsByUser, userId)],
          },
        }));

        return { ok: true, item: newItem };
      },
      toggleChecked: (userId, itemId) => {
        const ownerKey = getOwnerKey(userId);
        set((state) => ({
          itemsByUser: {
            ...(isRecord(state.itemsByUser) ? state.itemsByUser : {}),
            [ownerKey]: getUserItemsSafe(state.itemsByUser, userId).map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    checked: !item.checked,
                    checked_at: !item.checked ? new Date().toISOString() : undefined,
                  }
                : item,
            ),
          },
        }));
      },
      removeItem: (userId, itemId) => {
        const ownerKey = getOwnerKey(userId);
        set((state) => ({
          itemsByUser: {
            ...(isRecord(state.itemsByUser) ? state.itemsByUser : {}),
            [ownerKey]: getUserItemsSafe(state.itemsByUser, userId).filter(
              (item) => item.id !== itemId,
            ),
          },
        }));
      },
      clearChecked: (userId) => {
        const ownerKey = getOwnerKey(userId);
        set((state) => ({
          itemsByUser: {
            ...(isRecord(state.itemsByUser) ? state.itemsByUser : {}),
            [ownerKey]: getUserItemsSafe(state.itemsByUser, userId).filter(
              (item) => !item.checked,
            ),
          },
        }));
      },
      clearAll: (userId) => {
        const ownerKey = getOwnerKey(userId);
        set((state) => ({
          itemsByUser: {
            ...(isRecord(state.itemsByUser) ? state.itemsByUser : {}),
            [ownerKey]: [],
          },
        }));
      },
    }),
    {
      name: "@MyMercado:shopping-list",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
