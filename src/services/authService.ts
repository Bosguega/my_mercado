import { supabase } from "./supabaseClient";

/**
 * Verifica se o Supabase está configurado e retorna a instância
 */
export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY."
    );
  }
  return supabase;
}

/**
 * Obtém o usuário autenticado ou lança erro
 */
export async function getUserOrThrow() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) {
    throw new Error("Usuário não autenticado");
  }
  return data.user;
}

/**
 * Verifica se o usuário está autenticado
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const client = requireSupabase();
    const { data } = await client.auth.getUser();
    return !!data?.user;
  } catch {
    return false;
  }
}

/**
 * Obtém o usuário autenticado ou null
 */
export async function getUserOrNull() {
  try {
    const client = requireSupabase();
    const { data } = await client.auth.getUser();
    return data?.user ?? null;
  } catch {
    return null;
  }
}
