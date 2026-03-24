import { supabase } from './supabaseClient';

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

export async function login(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function register(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function logout() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const client = requireSupabase();
  const { data: { session }, error } = await client.auth.getSession();
  if (error) throw error;
  return session?.user || null;
}
