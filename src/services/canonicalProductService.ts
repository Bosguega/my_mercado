import { supabase } from "./supabaseClient";
import { getUserOrThrow, requireSupabase } from "./authService";
import type { CanonicalProduct } from "../types/domain";

// =========================
// CANONICAL PRODUCTS CRUD
// =========================

/**
 * Busca todos os produtos canônicos do usuário
 */
export async function getCanonicalProducts(): Promise<CanonicalProduct[]> {
  const user = await getUserOrThrow();
  const client = requireSupabase();

  const { data, error } = await client
    .from("canonical_products")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as CanonicalProduct[];
}

/**
 * Busca um produto canônico por ID
 */
export async function getCanonicalProduct(
  id: string
): Promise<CanonicalProduct | null> {
  const user = await getUserOrThrow();
  const client = requireSupabase();

  const { data, error } = await client
    .from("canonical_products")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data as CanonicalProduct;
}

/**
 * Cria um novo produto canônico
 */
export async function createCanonicalProduct(
  product: Pick<CanonicalProduct, "slug" | "name" | "category" | "brand">
): Promise<CanonicalProduct> {
  const user = await getUserOrThrow();
  const client = requireSupabase();

  const { data, error } = await client
    .from("canonical_products")
    .insert({
      ...product,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CanonicalProduct;
}

/**
 * Atualiza um produto canônico existente
 */
export async function updateCanonicalProduct(
  id: string,
  updates: Partial<Pick<CanonicalProduct, "name" | "category" | "brand">>
): Promise<void> {
  const user = await getUserOrThrow();
  const client = requireSupabase();

  const { error } = await client
    .from("canonical_products")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
}

/**
 * Deleta um produto canônico
 */
export async function deleteCanonicalProduct(id: string): Promise<void> {
  const user = await getUserOrThrow();
  const client = requireSupabase();

  // Verificar se há itens associados
  const { count } = await client
    .from("items")
    .select("*", { count: "exact", head: true })
    .eq("canonical_product_id", id);

  if (count && count > 0) {
    throw new Error(
      `Não é possível deletar: existem ${count} itens associados a este produto.`
    );
  }

  const { error } = await client
    .from("canonical_products")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
}

/**
 * Mescla dois produtos canônicos (secundário no primário)
 */
export async function mergeCanonicalProducts(
  primaryId: string,
  secondaryId: string
): Promise<void> {
  const user = await getUserOrThrow();
  const client = requireSupabase();

  // Verificar se ambos existem
  const primary = await getCanonicalProduct(primaryId);
  const secondary = await getCanonicalProduct(secondaryId);

  if (!primary || !secondary) {
    throw new Error("Produto canônico não encontrado");
  }

  // Mover associações de items e atualizar nomes/categorias
  const { error: itemsError } = await client
    .from("items")
    .update({
      canonical_product_id: primaryId,
      normalized_name: primary.name,
      category: primary.category,
    })
    .eq("canonical_product_id", secondaryId);

  if (itemsError) throw itemsError;

  // Mover associações de product_dictionary e atualizar nomes/categorias
  const { error: dictError } = await client
    .from("product_dictionary")
    .update({
      canonical_product_id: primaryId,
      normalized_name: primary.name,
      category: primary.category,
    })
    .eq("canonical_product_id", secondaryId);

  if (dictError) throw dictError;

  // Atualizar merge_count do primário
  const { error: updateError } = await client
    .from("canonical_products")
    .update({
      merge_count: (primary.merge_count || 1) + (secondary.merge_count || 1),
    })
    .eq("id", primaryId)
    .eq("user_id", user.id);

  if (updateError) throw updateError;

  // Deletar secundário
  const { error: deleteError } = await client
    .from("canonical_products")
    .delete()
    .eq("id", secondaryId)
    .eq("user_id", user.id);

  if (deleteError) throw deleteError;
}

/**
 * Limpa todos os produtos canônicos do usuário
 */
export async function clearCanonicalProductsInDB(): Promise<boolean> {
  const user = await getUserOrThrow();
  const client = requireSupabase();

  const { error } = await client
    .from("canonical_products")
    .delete()
    .eq("user_id", user.id);

  if (error) throw error;
  return true;
}

// =========================
// ITEM ASSOCIATION
// =========================

/**
 * Associa um item a um produto canônico
 */
export async function associateItemToCanonicalProduct(
  itemId: string,
  canonicalProductId: string | null
): Promise<void> {
  await getUserOrThrow();
  const client = requireSupabase();

  const { error } = await client
    .from("items")
    .update({ canonical_product_id: canonicalProductId })
    .eq("id", itemId);

  if (error) throw error;
}
