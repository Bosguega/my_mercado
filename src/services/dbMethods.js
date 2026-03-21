import { supabase } from './supabaseClient'

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.")
  }
  return supabase
}

// 🔐 Centraliza auth (evita repetir código)
async function getUserOrThrow() {
  const client = requireSupabase()
  const { data, error } = await client.auth.getUser()
  if (error || !data?.user) {
    throw new Error("Usuário não autenticado")
  }
  return data.user
}

// 📥 GET
export async function getAllReceiptsFromDB() {
  await getUserOrThrow() // só garante sessão

  const client = requireSupabase()
  const { data, error } = await client
    .from('receipts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error) throw error

  return (data || []).map((row) => ({
    id: row.id,
    establishment: row.establishment,
    date: row.date,
    items: row.items_json || []
  }))
}

// 📤 INSERT / UPSERT
export async function upsertReceiptToDB(receipt) {
  await getUserOrThrow()

  const user = await getUserOrThrow()

  const client = requireSupabase()
  const { error } = await client
    .from('receipts')
    .upsert([{
      id: receipt.id,
      establishment: receipt.establishment,
      date: receipt.date,
      items_json: receipt.items,
      user_id: user.id
    }])

  if (error) throw error
  return true
}

// 🗑️ DELETE
export async function deleteReceiptFromDB(id) {
  await getUserOrThrow()

  const client = requireSupabase()
  const { error } = await client
    .from('receipts')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

// 🔄 RESTORE (melhorado)
export async function restoreReceiptsToDB(receipts) {
  const user = await getUserOrThrow()

  // ⚠️ Estratégia mais segura:
  // 1. Inserir primeiro
  const rows = receipts.map((r) => ({
    id: r.id,
    establishment: r.establishment,
    date: r.date,
    items_json: r.items,
    user_id: user.id
  }))

  const client = requireSupabase()
  const { error: insertError } = await client
    .from('receipts')
    .upsert(rows)

  if (insertError) throw insertError

  // 2. (Opcional) limpar duplicados depois
  // 👉 depende da sua lógica futura

  return true
}
