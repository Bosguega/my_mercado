import { supabase } from './supabaseClient'

// 🔐 Centraliza auth (evita repetir código)
async function getUserOrThrow() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    throw new Error("Usuário não autenticado")
  }
  return data.user
}

// 📥 GET
export async function getAllReceiptsFromDB() {
  await getUserOrThrow() // só garante sessão

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .order('created_at', { ascending: false })

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

  const { error } = await supabase
    .from('receipts')
    .upsert([{
      id: receipt.id,
      establishment: receipt.establishment,
      date: receipt.date,
      items_json: receipt.items
      // ❌ sem user_id → banco preenche via auth.uid()
    }])

  if (error) throw error
  return true
}

// 🗑️ DELETE
export async function deleteReceiptFromDB(id) {
  await getUserOrThrow()

  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

// 🔄 RESTORE (melhorado)
export async function restoreReceiptsToDB(receipts) {
  await getUserOrThrow()

  // ⚠️ Estratégia mais segura:
  // 1. Inserir primeiro
  const rows = receipts.map((r) => ({
    id: r.id,
    establishment: r.establishment,
    date: r.date,
    items_json: r.items
  }))

  const { error: insertError } = await supabase
    .from('receipts')
    .upsert(rows)

  if (insertError) throw insertError

  // 2. (Opcional) limpar duplicados depois
  // 👉 depende da sua lógica futura

  return true
}