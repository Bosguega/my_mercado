import { getUserOrThrow, requireSupabase } from "./authService";
import type { DictionaryEntry, DictionaryMap } from "../types/domain";

interface DbDictionaryRow {
  key: string;
  normalized_name: string;
  category?: string | null;
  canonical_product_id?: string | null;
}

export type DictionaryUpdateEntry = Pick<
  DictionaryEntry,
  "key" | "normalized_name" | "category" | "canonical_product_id"
>;

// =========================
// DICTIONARY CRUD
// =========================

/**
 * Busca todas as entradas do dicionário
 */
export async function getFullDictionaryFromDB(): Promise<DictionaryEntry[]> {
  const user = await getUserOrThrow();
  const client = requireSupabase();

  const { data, error } = await client
    .from("product_dictionary")
    .select("*")
    .eq("user_id", user.id)
    .order("key", { ascending: true });

  if (error) throw error;
  return (data || []) as DictionaryEntry[];
}

/**
 * Atualiza uma entrada do dicionário
 */
export async function updateDictionaryEntryInDB(
  key: string,
  normalizedName: string,
  category: string,
  canonicalProductId?: string | null
): Promise<boolean> {
  const user = await getUserOrThrow();
  const client = requireSupabase();

  const { error } = await client
    .from("product_dictionary")
    .update({
      normalized_name: normalizedName,
      category,
      canonical_product_id: canonicalProductId,
    })
    .eq("user_id", user.id)
    .eq("key", key);

  if (error) throw error;
  return true;
}

/**
 * Aplica uma entrada do dicionário aos itens salvos
 */
export async function applyDictionaryEntryToSavedItems(
  key: string,
  normalizedName: string | undefined,
  category: string | undefined
): Promise<{ updatedCount: number }> {
  await getUserOrThrow();
  const client = requireSupabase();

  if (!key) return { updatedCount: 0 };

  const patch: Partial<{
    normalized_name: string;
    category: string;
    canonical_product_id: string | null;
  }> = {};
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

/**
 * Deleta uma entrada do dicionário
 */
export async function deleteDictionaryEntryFromDB(
  key: string
): Promise<boolean> {
  const user = await getUserOrThrow();
  const client = requireSupabase();

  const { error } = await client
    .from("product_dictionary")
    .delete()
    .eq("user_id", user.id)
    .eq("key", key);

  if (error) throw error;
  return true;
}

/**
 * Limpa todo o dicionário do usuário
 */
export async function clearDictionaryInDB(): Promise<boolean> {
  const user = await getUserOrThrow();
  const client = requireSupabase();

  const { error } = await client
    .from("product_dictionary")
    .delete()
    .eq("user_id", user.id);

  if (error) throw error;
  return true;
}

// =========================
// DICTIONARY BATCH OPERATIONS
// =========================

/**
 * Busca entradas do dicionário por chaves
 */
export async function getDictionary(keys: string[]): Promise<DictionaryMap> {
  if (!keys || keys.length === 0) return {};

  const user = await getUserOrThrow();
  const client = requireSupabase();

  const { data, error } = await client
    .from("product_dictionary")
    .select("key, normalized_name, category, canonical_product_id")
    .eq("user_id", user.id)
    .in("key", keys);

  if (error) throw error;

  const rows = (data || []) as DbDictionaryRow[];
  return rows.reduce((acc: DictionaryMap, row) => {
    acc[row.key] = {
      normalized_name: row.normalized_name,
      category: row.category || undefined,
      canonical_product_id: row.canonical_product_id || undefined,
    };
    return acc;
  }, {});
}

/**
 * Atualiza múltiplas entradas do dicionário em batch
 */
export async function updateDictionary(
  entries: DictionaryUpdateEntry[]
): Promise<void> {
  if (!entries || entries.length === 0) return;

  const user = await getUserOrThrow();
  const client = requireSupabase();

  const rows = entries.map((e) => ({
    user_id: user.id,
    key: e.key,
    normalized_name: e.normalized_name,
    category: e.category || "Outros",
    canonical_product_id: e.canonical_product_id,
  }));

  const { error } = await client
    .from("product_dictionary")
    .upsert(rows, { onConflict: "user_id,key" });

  if (error) throw error;
}

// =========================
// DICTIONARY - CANONICAL PRODUCT ASSOCIATION
// =========================

/**
 * Associa uma entrada do dicionário a um produto canônico
 */
export async function associateDictionaryToCanonicalProduct(
  key: string,
  canonicalProductId: string | null
): Promise<void> {
  const user = await getUserOrThrow();
  const client = requireSupabase();

  const { error } = await client
    .from("product_dictionary")
    .update({ canonical_product_id: canonicalProductId })
    .eq("user_id", user.id)
    .eq("key", key);

  if (error) throw error;
}
