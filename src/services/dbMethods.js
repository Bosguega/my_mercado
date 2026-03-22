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
  
  // No novo modelo relacional, buscamos as notas e seus itens associados
  const { data, error } = await client
    .from('receipts')
    .select(`
      id,
      establishment,
      date,
      created_at,
      items (*)
    `)
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error) {
    console.error('Erro ao buscar notas:', error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    establishment: row.establishment,
    date: row.date,
    items: (row.items || []).map(item => ({
      ...item,
      // Mapeia de volta para o formato esperado pela UI (strings BRL)
      qty: item.quantity ? item.quantity.toString().replace('.', ',') : '1',
      unitPrice: item.price ? item.price.toFixed(2).replace('.', ',') : '0,00',
      total: (item.price * item.quantity).toFixed(2).replace('.', ',')
    }))
  }))
}

// 📤 INSERT / UPSERT (Etapa 9)
export async function saveReceiptToDB(receiptData, items) {
  const user = await getUserOrThrow()
  const client = requireSupabase()

  // Converte a data (ex: 22/03/2026 07:30:59) para formato ISO (AAAA-MM-DDTHH:mm:ss) para o Postgres
  let isoDate = receiptData.date;
  if (typeof receiptData.date === 'string' && receiptData.date.includes('/')) {
    const parts = receiptData.date.split(" ");
    const [day, month, year] = parts[0].split("/");
    isoDate = `${year}-${month}-${day}`;
    if (parts[1]) {
      isoDate += `T${parts[1]}`;
    } else {
      isoDate += `T12:00:00`;
    }
  }

  // 1. Inserir Receipt (Etapa 9.1)
  const { data: receipt, error: receiptError } = await client
    .from('receipts')
    .upsert({
      id: receiptData.id,
      establishment: receiptData.establishment,
      date: isoDate,
      user_id: user.id
    })
    .select()
    .single()

  if (receiptError) {
    console.error('Erro ao salvar nota:', receiptError);
    throw receiptError;
  }

  // 2. Limpar itens antigos (para evitar duplicados em caso de re-scan) e Inserir novos (batch)
  if (items && items.length > 0) {
    // Remove itens anteriores dessa nota (Etapa de limpeza para integridade)
    await client
      .from('items')
      .delete()
      .eq('receipt_id', receipt.id)

    // Insere os itens processados
    const { error: itemsError } = await client
      .from('items')
      .insert(
        items.map(item => ({
          receipt_id: receipt.id,
          name: item.name,
          normalized_key: item.normalized_key,
          normalized_name: item.normalized_name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price
        }))
      )

    if (itemsError) {
      console.error('Erro ao salvar itens:', itemsError);
      throw itemsError;
    }
  }

  return receipt;
}

// 🗑️ DELETE
export async function deleteReceiptFromDB(id) {
  await getUserOrThrow()

  const client = requireSupabase()
  
  // Com o CASCADE configurado no banco (conforme o schema sql fornecido), deletar a nota remove os itens
  const { error } = await client
    .from('receipts')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

// 🔄 RESTORE (mantivemos por compatibilidade histórica mas adaptamos)
export async function restoreReceiptsToDB(receipts) {
  for (const receipt of receipts) {
    await saveReceiptToDB({
      id: receipt.id,
      establishment: receipt.establishment,
      date: receipt.date
    }, receipt.items);
  }
  return true
}
