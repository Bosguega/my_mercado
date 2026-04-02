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
 * Realiza login com email e senha
 */
export async function login(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    // Traduzir mensagens de erro comuns do Supabase
    if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials')) {
      throw new Error('Email ou senha incorretos. Verifique suas credenciais.');
    }
    if (error.message?.includes('Email not confirmed') || error.message?.includes('email_not_confirmed')) {
      throw new Error('Email não confirmado. Verifique sua caixa de entrada.');
    }
    throw error;
  }
  return data;
}

/**
 * Realiza cadastro com email e senha
 */
export async function register(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email,
    password,
  });
  if (error) {
    // Traduzir mensagens de erro comuns do Supabase
    if (error.message?.includes('User already registered') || error.message?.includes('already_registered')) {
      throw new Error('Este email já está cadastrado. Faça login ou use outro email.');
    }
    if (error.message?.includes('Password should be at least') || error.message?.includes('weak_password')) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }
    if (error.message?.includes('Invalid email') || error.message?.includes('invalid_email')) {
      throw new Error('Email inválido. Verifique o formato.');
    }
    throw error;
  }
  return data;
}

/**
 * Realiza logout do usuário
 */
export async function logout() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

/**
 * Obtém o usuário autenticado ou null
 */
export async function getCurrentUser() {
  const client = requireSupabase();
  const { data: { session }, error } = await client.auth.getSession();
  if (error) throw error;
  return session?.user || null;
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
 * Obtém o usuário autenticado ou null (alias para getCurrentUser)
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
