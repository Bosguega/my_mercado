import { supabase } from './supabaseClient'
import { parseToDate, formatToISO, formatToBR } from '../utils/date'
import { parseBRL } from '../utils/currency'

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
    date: formatToBR(row.date),
    items: (row.items || []).map(item => ({
      ...item,
      // Mapeia de volta para o formato esperado pela UI (strings BRL)
      qty: item.quantity ? item.quantity.toString().replace('.', ',') : '1',
      unitPrice: item.price ? item.price.toFixed(2).replace('.', ',') : '0,00',
      total: (item.price * item.quantity).toFixed(2).replace('.', ',')
    }))
  }))
}

// 🔄 RESTORE (Importação em massa)
export async function restoreReceiptsToDB(receipts) {
  const user = await getUserOrThrow();
  const client = requireSupabase();

  for (const receiptData of receipts) {
    const isoDate = formatToISO(receiptData.date);

    // 1. Upsert da Nota
    const { data: receipt, error: receiptError } = await client
      .from('receipts')
      .upsert({
        id: receiptData.id,
        establishment: receiptData.establishment,
        date: isoDate,
        user_id: user.id
      })
      .select()
      .single();

    if (receiptError) throw receiptError;

    // 2. Upsert dos Itens
    if (receiptData.items && receiptData.items.length > 0) {
      // Limpa itens antigos para evitar duplicados
      await client
        .from('items')
        .delete()
        .eq('receipt_id', receipt.id);

      const { error: itemsError } = await client
        .from('items')
        .insert(
          receiptData.items.map(item => {
            // Garante que valores numéricos sejam extraídos corretamente (do backup ou da UI)
            const qty = parseBRL(item.qty || item.quantity);
            const price = parseBRL(item.unitPrice || item.price);
            
            return {
              receipt_id: receipt.id,
              name: item.name,
              normalized_key: item.normalized_key,
              normalized_name: item.normalized_name,
              category: item.category,
              quantity: qty,
              unit: item.unit || 'un',
              price: price
            };
          })
        );

      if (itemsError) throw itemsError;
    }
  }
  return true;
}

// 📤 INSERT / UPSERT (Etapa 9)
export async function saveReceiptToDB(receiptData, items) {
  const user = await getUserOrThrow()
  const client = requireSupabase()

  // Converte a data para o formato ISO compatível com o Supabase (Postgres)
  const isoDate = formatToISO(receiptData.date);

  // 1. Inserir Receipt
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
        items.map(item => {
          // Garante conversão numérica correta antes de salvar no Postgres
          const qty = parseBRL(item.qty || item.quantity);
          const price = parseBRL(item.unitPrice || item.price);

          return {
            receipt_id: receipt.id,
            name: item.name,
            normalized_key: item.normalized_key,
            normalized_name: item.normalized_name,
            category: item.category,
            quantity: qty,
            unit: item.unit || 'un',
            price: price
          };
        })
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

// 📖 DICIONÁRIO - CRUD
export async function getFullDictionaryFromDB() {
  await getUserOrThrow();
  const client = requireSupabase();
  const { data, error } = await client
    .from('product_dictionary')
    .select('*')
    .order('key', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function updateDictionaryEntryInDB(key, normalizedName, category) {
  await getUserOrThrow();
  const client = requireSupabase();
  const { error } = await client
    .from('product_dictionary')
    .update({ normalized_name: normalizedName, category })
    .eq('key', key);

  if (error) throw error;
  return true;
}

export async function deleteDictionaryEntryFromDB(key) {
  await getUserOrThrow();
  const client = requireSupabase();
  const { error } = await client
    .from('product_dictionary')
    .delete()
    .eq('key', key);

  if (error) throw error;
  return true;
}

export async function clearDictionaryInDB() {
  await getUserOrThrow();
  const client = requireSupabase();
  // No Supabase, para deletar tudo sem filtro id, usamos um neq dummy se RLS permitir
  const { error } = await client
    .from('product_dictionary')
    .delete()
    .neq('key', '___dummy___');

  if (error) throw error;
  return true;
}
