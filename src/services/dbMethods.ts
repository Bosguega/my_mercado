import { supabase } from "./supabaseClient";
import { formatToISO, formatToBR } from "../utils/date";
import { parseBRL } from "../utils/currency";
import { toUserScopedReceiptId } from "../utils/receiptId";
import type { DictionaryEntry, DictionaryMap, Receipt, ReceiptItem } from "../types/domain";

type DictionaryUpdateEntry = Pick<DictionaryEntry, "key" | "normalized_name" | "category">;

interface DbItemRow {
  id?: string;
  name: string;
  normalized_key?: string | null;
  normalized_name?: string | null;
  category?: string | null;
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

interface DbDictionaryRow {
  key: string;
  normalized_name: string;
  category?: string | null;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
    );
  }
  return supabase;
}

async function getUserOrThrow() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) {
    throw new Error("Usuario nao autenticado");
  }
  return data.user;
}

function isLegacyDictionarySchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  const code = String(e.code ?? "");
  const message = `${String(e.message ?? "")} ${String(e.details ?? "")} ${String(e.hint ?? "")}`.toLowerCase();
  return (
    code === "42703" ||
    code === "42P10" ||
    message.includes("user_id") ||
    message.includes("on conflict")
  );
}

// GET
export async function getAllReceiptsFromDB(): Promise<Receipt[]> {
  await getUserOrThrow();
  const client = requireSupabase();

  const { data, error } = await client
    .from("receipts")
    .select(`
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
        quantity,
        unit,
        price
      )
    `)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    console.error("Erro ao buscar notas:", error);
    throw error;
  }

  const rows = (data || []) as DbReceiptRow[];
  return rows.map((row) => ({
    id: row.id,
    establishment: row.establishment,
    date: formatToBR(row.date),
    items: (row.items || []).map((item) => {
      const quantity = item.quantity ?? 1;
      const price = item.price ?? 0;
      return {
        ...item,
        normalized_key: item.normalized_key ?? undefined,
        normalized_name: item.normalized_name ?? undefined,
        category: item.category ?? undefined,
        quantity,
        unit: item.unit ?? undefined,
        price,
        qty: quantity.toString().replace(".", ","),
        unitPrice: price.toFixed(2).replace(".", ","),
        total: (price * quantity).toFixed(2).replace(".", ","),
      };
    }),
  }));
}

// RESTORE
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
        receiptData.items.map((item: ReceiptItem) => {
          const qty = parseBRL(item.qty || item.quantity);
          const price = parseBRL(item.unitPrice || item.price);

          return {
            receipt_id: receipt.id,
            name: item.name,
            normalized_key: item.normalized_key,
            normalized_name: item.normalized_name,
            category: item.category,
            quantity: qty,
            unit: item.unit || "un",
            price,
          };
        }),
      );

      if (itemsError) throw itemsError;
    }
  }
  return true;
}

// INSERT / UPSERT
export async function saveReceiptToDB(
  receiptData: Receipt,
  items: ReceiptItem[],
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
      items.map((item: ReceiptItem) => {
        const qty = parseBRL(item.qty || item.quantity);
        const price = parseBRL(item.unitPrice || item.price);

        return {
          receipt_id: receipt.id,
          name: item.name,
          normalized_key: item.normalized_key,
          normalized_name: item.normalized_name,
          category: item.category,
          quantity: qty,
          unit: item.unit || "un",
          price,
        };
      }),
    );

    if (itemsError) {
      console.error("Erro ao salvar itens:", itemsError);
      throw itemsError;
    }
  }

  return receipt;
}

// DELETE
export async function deleteReceiptFromDB(id: string): Promise<boolean> {
  await getUserOrThrow();

  const client = requireSupabase();
  const { error } = await client.from("receipts").delete().eq("id", id);

  if (error) throw error;
  return true;
}

// DICIONARIO - CRUD
export async function getFullDictionaryFromDB(): Promise<DictionaryEntry[]> {
  const user = await getUserOrThrow();
  const client = requireSupabase();
  const query = client
    .from("product_dictionary")
    .select("*")
    .eq("user_id", user.id)
    .order("key", { ascending: true });

  let { data, error } = await query;
  if (error && isLegacyDictionarySchemaError(error)) {
    const legacyResponse = await client
      .from("product_dictionary")
      .select("*")
      .order("key", { ascending: true });

    data = legacyResponse.data;
    error = legacyResponse.error;
  }

  if (error) throw error;
  return (data || []) as DictionaryEntry[];
}

export async function updateDictionaryEntryInDB(
  key: string,
  normalizedName: string,
  category: string,
): Promise<boolean> {
  const user = await getUserOrThrow();
  const client = requireSupabase();
  let { error } = await client
    .from("product_dictionary")
    .update({ normalized_name: normalizedName, category })
    .eq("user_id", user.id)
    .eq("key", key);

  if (error && isLegacyDictionarySchemaError(error)) {
    const legacyResponse = await client
      .from("product_dictionary")
      .update({ normalized_name: normalizedName, category })
      .eq("key", key);

    error = legacyResponse.error;
  }

  if (error) throw error;
  return true;
}

export async function applyDictionaryEntryToSavedItems(
  key: string,
  normalizedName: string | undefined,
  category: string | undefined,
): Promise<{ updatedCount: number }> {
  await getUserOrThrow();
  const client = requireSupabase();

  if (!key) return { updatedCount: 0 };

  const patch: Partial<{ normalized_name: string; category: string }> = {};
  if (normalizedName !== undefined) patch.normalized_name = normalizedName;
  if (category !== undefined) patch.category = category;

  if (Object.keys(patch).length === 0) return { updatedCount: 0 };

  const { error, count } = await client
    .from("items")
    .update(patch, { count: "exact" })
    .eq("normalized_key", key);

  if (error) throw error;
  return { updatedCount: count ?? 0 };
}

export async function deleteDictionaryEntryFromDB(key: string): Promise<boolean> {
  const user = await getUserOrThrow();
  const client = requireSupabase();
  let { error } = await client
    .from("product_dictionary")
    .delete()
    .eq("user_id", user.id)
    .eq("key", key);

  if (error && isLegacyDictionarySchemaError(error)) {
    const legacyResponse = await client
      .from("product_dictionary")
      .delete()
      .eq("key", key);

    error = legacyResponse.error;
  }

  if (error) throw error;
  return true;
}

export async function clearDictionaryInDB(): Promise<boolean> {
  const user = await getUserOrThrow();
  const client = requireSupabase();
  let { error } = await client.from("product_dictionary").delete().eq("user_id", user.id);

  if (error && isLegacyDictionarySchemaError(error)) {
    const legacyResponse = await client
      .from("product_dictionary")
      .delete()
      .neq("key", "___dummy___");

    error = legacyResponse.error;
  }

  if (error) throw error;
  return true;
}

// DICIONARIO - Batch
export async function getDictionary(keys: string[]): Promise<DictionaryMap> {
  if (!keys || keys.length === 0) return {};

  const user = await getUserOrThrow();
  const client = requireSupabase();

  let { data, error } = await client
    .from("product_dictionary")
    .select("key, normalized_name, category")
    .eq("user_id", user.id)
    .in("key", keys);

  if (error && isLegacyDictionarySchemaError(error)) {
    const legacyResponse = await client
      .from("product_dictionary")
      .select("key, normalized_name, category")
      .in("key", keys);

    data = legacyResponse.data;
    error = legacyResponse.error;
  }

  if (error) throw error;

  const rows = (data || []) as DbDictionaryRow[];
  return rows.reduce((acc: DictionaryMap, row) => {
    acc[row.key] = {
      normalized_name: row.normalized_name,
      category: row.category || undefined,
    };
    return acc;
  }, {});
}

export async function updateDictionary(entries: DictionaryUpdateEntry[]): Promise<void> {
  if (!entries || entries.length === 0) return;

  const user = await getUserOrThrow();
  const client = requireSupabase();

  const rows = entries.map((e) => ({
    user_id: user.id,
    key: e.key,
    normalized_name: e.normalized_name,
    category: e.category || "Outros",
  }));

  let { error } = await client
    .from("product_dictionary")
    .upsert(rows, { onConflict: "user_id,key" });

  if (error && isLegacyDictionarySchemaError(error)) {
    const legacyRows = entries.map((e) => ({
      key: e.key,
      normalized_name: e.normalized_name,
      category: e.category || "Outros",
    }));

    const legacyResponse = await client
      .from("product_dictionary")
      .upsert(legacyRows, { onConflict: "key" });

    error = legacyResponse.error;
  }

  if (error) throw error;
}
