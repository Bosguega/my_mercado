import { supabase } from "./supabaseClient";
import { formatToISO, formatToBR } from "../utils/date";
import { parseBRL, formatBRL, calc } from "../utils/currency";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toUserScopedReceiptId } from "../utils/receiptId";
import { getUserOrThrow, requireSupabase } from "./authService";
import type { Receipt, ReceiptItem } from "../types/domain";

interface DbItemRow {
  id?: string;
  name: string;
  normalized_key?: string | null;
  normalized_name?: string | null;
  category?: string | null;
  canonical_product_id?: string | null;
  quantity?: number | null;
  unit?: string | null;
  price?: number | null;
}

interface DbReceiptRow {
  id: string;
  establishment: string;
  date: string;
  created_at?: string | null;
  items?: DbItemRow[] | null;
}

/**
 * Mapeia um item do banco de dados para o formato ReceiptItem
 */
function mapDbItemToReceiptItem(item: DbItemRow): ReceiptItem {
  const quantity = item.quantity ?? 1;
  const price = item.price ?? 0;
  const total = calc.mul(price, quantity);

  return {
    id: item.id,
    name: item.name,
    normalized_key: item.normalized_key ?? undefined,
    normalized_name: item.normalized_name ?? undefined,
    category: item.category ?? undefined,
    canonical_product_id: item.canonical_product_id ?? undefined,
    quantity,
    unit: item.unit ?? undefined,
    price,
    qty: formatBRL(quantity),
    unitPrice: formatBRL(price),
    total: formatBRL(total),
  };
}

/**
 * Mapeia um ReceiptItem para o formato de inserção no banco
 */
function mapReceiptItemToDb(item: ReceiptItem, receiptId: string) {
  const qty = parseBRL(item.qty || item.quantity);
  const price = parseBRL(item.unitPrice || item.price);

  return {
    receipt_id: receiptId,
    name: item.name,
    normalized_key: item.normalized_key,
    normalized_name: item.normalized_name,
    category: item.category,
    canonical_product_id: item.canonical_product_id,
    quantity: qty,
    unit: item.unit || "un",
    price,
  };
}

/**
 * Mapeia uma linha do banco para o formato Receipt
 */
function mapDbReceiptToReceipt(row: DbReceiptRow): Receipt {
  return {
    id: row.id,
    establishment: row.establishment,
    date: formatToBR(row.date),
    items: (row.items || []).map(mapDbItemToReceiptItem),
  };
}

// =========================
// RECEIPT CRUD
// =========================

export interface GetReceiptsFilters {
  search?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GetReceiptsResult {
  data: Receipt[];
  hasMore: boolean;
  total: number;
}

/**
 * Busca recibos com paginação e filtros
 */
export async function getReceiptsPaginated(
  page: number = 1,
  pageSize: number = 20,
  filters?: GetReceiptsFilters
): Promise<GetReceiptsResult> {
  await getUserOrThrow();
  const client = requireSupabase();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from("receipts")
    .select(
      `
      id,
      establishment,
      date,
      created_at,
      items (
        id,
        name,
        normalized_key,
        normalized_name,
        category,
        canonical_product_id,
        quantity,
        unit,
        price
      )
    `,
      { count: "exact" }
    );

  // Aplicar filtro de busca
  if (filters?.search) {
    query = query.ilike("establishment", `%${filters.search}%`);
  }

  // Aplicar filtro de período
  if (filters?.period && filters.period !== "all") {
    const now = new Date();
    if (filters.period === "this-month") {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const startDate = formatToISO(start);
      const endDate = formatToISO(end);
      if (startDate && endDate) {
        query = query.gte("date", startDate).lte("date", endDate);
      }
    } else if (filters.period === "last-3-months") {
      const start = startOfMonth(subMonths(now, 3));
      const startDate = formatToISO(start);
      if (startDate) {
        query = query.gte("date", startDate);
      }
    } else if (filters.period === "custom" && filters.startDate && filters.endDate) {
      query = query.gte("date", filters.startDate).lte("date", filters.endDate);
    }
  }

  // Aplicar ordenação
  const sortBy = filters?.sortBy || "date";
  const sortOrder = filters?.sortOrder || "desc";

  if (sortBy === "date") {
    query = query.order("date", { ascending: sortOrder === "asc" });
  } else if (sortBy === "store") {
    query = query.order("establishment", { ascending: sortOrder === "asc" });
  } else {
    query = query.order("created_at", { ascending: sortOrder === "asc" });
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Erro ao buscar notas:", error);
    throw error;
  }

  const rows = (data || []) as DbReceiptRow[];
  const receipts = rows.map(mapDbReceiptToReceipt);

  return {
    data: receipts,
    hasMore: to < (count || 0),
    total: count || 0,
  };
}

/**
 * Busca todos os recibos (mantido para compatibilidade)
 */
export async function getAllReceiptsFromDB(): Promise<Receipt[]> {
  const result = await getReceiptsPaginated(1, 2000);
  return result.data;
}

/**
 * Restaura múltiplos recibos no banco
 */
export async function restoreReceiptsToDB(receipts: Receipt[]): Promise<boolean> {
  const user = await getUserOrThrow();
  const client = requireSupabase();

  for (const receiptData of receipts) {
    const scopedReceiptId = toUserScopedReceiptId(receiptData.id, user.id);
    const isoDate = formatToISO(receiptData.date);

    const { data: receipt, error: receiptError } = await client
      .from("receipts")
      .upsert({
        id: scopedReceiptId,
        establishment: receiptData.establishment,
        date: isoDate,
        user_id: user.id,
      })
      .select()
      .single();

    if (receiptError) throw receiptError;

    if (receiptData.items && receiptData.items.length > 0) {
      await client.from("items").delete().eq("receipt_id", receipt.id);

      const { error: itemsError } = await client.from("items").insert(
        receiptData.items.map((item: ReceiptItem) =>
          mapReceiptItemToDb(item, receipt.id)
        )
      );

      if (itemsError) throw itemsError;
    }
  }
  return true;
}

/**
 * Salva ou atualiza um recibo no banco
 */
export async function saveReceiptToDB(
  receiptData: Receipt,
  items: ReceiptItem[]
) {
  const user = await getUserOrThrow();
  const client = requireSupabase();
  const scopedReceiptId = toUserScopedReceiptId(receiptData.id, user.id);

  const isoDate = formatToISO(receiptData.date);

  const { data: receipt, error: receiptError } = await client
    .from("receipts")
    .upsert({
      id: scopedReceiptId,
      establishment: receiptData.establishment,
      date: isoDate,
      user_id: user.id,
    })
    .select()
    .single();

  if (receiptError) {
    console.error("Erro ao salvar nota:", receiptError);
    throw receiptError;
  }

  if (items && items.length > 0) {
    await client.from("items").delete().eq("receipt_id", receipt.id);

    const { error: itemsError } = await client.from("items").insert(
      items.map((item: ReceiptItem) => mapReceiptItemToDb(item, receipt.id))
    );

    if (itemsError) {
      console.error("Erro ao salvar itens:", itemsError);
      throw itemsError;
    }
  }

  // Retornar receipt com data em formato BR para consistência
  return {
    id: receipt.id,
    establishment: receipt.establishment,
    date: formatToBR(receipt.date),
    created_at: receipt.created_at,
  };
}

/**
 * Deleta um recibo do banco
 */
export async function deleteReceiptFromDB(id: string): Promise<boolean> {
  await getUserOrThrow();

  const client = requireSupabase();
  const { error } = await client.from("receipts").delete().eq("id", id);

  if (error) throw error;
  return true;
}

/**
 * Limpa todos os recibos do usuário
 */
export async function clearReceiptsAndItemsFromDB(): Promise<boolean> {
  const user = await getUserOrThrow();
  const client = requireSupabase();
  const { error } = await client.from("receipts").delete().eq("user_id", user.id);
  if (error) throw error;
  return true;
}
