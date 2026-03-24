import { supabase } from './supabaseClient'
import { formatToISO, formatToBR } from '../utils/date'
import { parseBRL } from '../utils/currency'
import { toUserScopedReceiptId } from '../utils/receiptId'

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

function isLegacyDictionarySchemaError(error: any) { // TODO: type
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()
  return (
    error?.code === '42703' || // undefined column
    error?.code === '42P10' || // invalid ON CONFLICT target
    message.includes('user_id') ||
    message.includes('on conflict')
  )
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
export async function restoreReceiptsToDB(receipts: any[]) { // TODO: type
  const user = await getUserOrThrow();
  const client = requireSupabase();

  for (const receiptData of receipts) {
    const scopedReceiptId = toUserScopedReceiptId(receiptData.id, user.id);
    const isoDate = formatToISO(receiptData.date);

    // 1. Upsert da Nota
    const { data: receipt, error: receiptError } = await client
      .from('receipts')
      .upsert({
        id: scopedReceiptId,
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
          receiptData.items.map((item: any) => { // TODO: type
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
export async function saveReceiptToDB(receiptData: any, items: any[]) { // TODO: type
  const user = await getUserOrThrow()
  const client = requireSupabase()
  const scopedReceiptId = toUserScopedReceiptId(receiptData.id, user.id)

  // Converte a data para o formato ISO compatível com o Supabase (Postgres)
  const isoDate = formatToISO(receiptData.date);

  // 1. Inserir Receipt
  const { data: receipt, error: receiptError } = await client
    .from('receipts')
    .upsert({
      id: scopedReceiptId,
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
        items.map((item: any) => { // TODO: type
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
export async function deleteReceiptFromDB(id: string) {
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
  const user = await getUserOrThrow();
  const client = requireSupabase();
  const query = client
    .from('product_dictionary')
    .select('*')
    .eq('user_id', user.id)
    .order('key', { ascending: true });

  let { data, error } = await query;
  if (error && isLegacyDictionarySchemaError(error)) {
    const legacyResponse = await client
      .from('product_dictionary')
      .select('*')
      .order('key', { ascending: true });

    data = legacyResponse.data;
    error = legacyResponse.error;
  }

  if (error) throw error;
  return data || [];
}

export async function updateDictionaryEntryInDB(
  key: string,
  normalizedName: string,
  category: string,
) {
  const user = await getUserOrThrow();
  const client = requireSupabase();
  let { error } = await client
    .from('product_dictionary')
    .update({ normalized_name: normalizedName, category })
    .eq('user_id', user.id)
    .eq('key', key);

  if (error && isLegacyDictionarySchemaError(error)) {
    const legacyResponse = await client
      .from('product_dictionary')
      .update({ normalized_name: normalizedName, category })
      .eq('key', key);

    error = legacyResponse.error;
  }

  if (error) throw error;
  return true;
}

// 🔁 Corrigir itens salvos usando o dicionário
export async function applyDictionaryEntryToSavedItems(
  key: string,
  normalizedName: string | undefined,
  category: string | undefined,
) {
  await getUserOrThrow();
  const client = requireSupabase();

  if (!key) return { updatedCount: 0 };

  const patch: Record<string, any> = {}; // TODO: type
  if (normalizedName !== undefined) patch.normalized_name = normalizedName;
  if (category !== undefined) patch.category = category;

  if (Object.keys(patch).length === 0) return { updatedCount: 0 };

  const { error, count } = await client
    .from('items')
    .update(patch, { count: 'exact' })
    .eq('normalized_key', key);

  if (error) throw error;
  return { updatedCount: count ?? 0 };
}

export async function deleteDictionaryEntryFromDB(key: string) {
  const user = await getUserOrThrow();
  const client = requireSupabase();
  let { error } = await client
    .from('product_dictionary')
    .delete()
    .eq('user_id', user.id)
    .eq('key', key);

  if (error && isLegacyDictionarySchemaError(error)) {
    const legacyResponse = await client
      .from('product_dictionary')
      .delete()
      .eq('key', key);

    error = legacyResponse.error;
  }

  if (error) throw error;
  return true;
}

export async function clearDictionaryInDB() {
  const user = await getUserOrThrow();
  const client = requireSupabase();
  // Escopo explícito por usuário para evitar limpeza global.
  let { error } = await client
    .from('product_dictionary')
    .delete()
    .eq('user_id', user.id);

  // Fallback para schema legado (sem user_id).
  if (error && isLegacyDictionarySchemaError(error)) {
    const legacyResponse = await client
      .from('product_dictionary')
      .delete()
      .neq('key', '___dummy___');

    error = legacyResponse.error;
  }

  if (error) throw error;
  return true;
}

// 📖 DICIONÁRIO - Batch read (usado pelo productService pipeline)
export async function getDictionary(keys: string[]) {
  if (!keys || keys.length === 0) return {};

  const user = await getUserOrThrow();
  const client = requireSupabase();

  let { data, error } = await client
    .from('product_dictionary')
    .select('key, normalized_name, category')
    .eq('user_id', user.id)
    .in('key', keys);

  if (error && isLegacyDictionarySchemaError(error)) {
    const legacyResponse = await client
      .from('product_dictionary')
      .select('key, normalized_name, category')
      .in('key', keys);

    data = legacyResponse.data;
    error = legacyResponse.error;
  }

  if (error) throw error;

  // Retorna um mapa { key: { normalized_name, category } }
  return (data || []).reduce((acc: Record<string, any>, row: any) => { // TODO: type
    acc[row.key] = {
      normalized_name: row.normalized_name,
      category: row.category,
    };
    return acc;
  }, {});
}

// 📖 DICIONÁRIO - Batch upsert (usado pelo productService pipeline)
export async function updateDictionary(entries: any[]) { // TODO: type
  if (!entries || entries.length === 0) return;

  const user = await getUserOrThrow();
  const client = requireSupabase();

  const rows = entries.map((e: any) => ({ // TODO: type
    user_id: user.id,
    key: e.key,
    normalized_name: e.normalized_name,
    category: e.category || 'Outros',
  }));

  let { error } = await client
    .from('product_dictionary')
    .upsert(rows, { onConflict: 'user_id,key' });

  // Fallback para schema legado (sem user_id e PK simples em key).
  if (error && isLegacyDictionarySchemaError(error)) {
    const legacyRows = entries.map((e: any) => ({ // TODO: type
      key: e.key,
      normalized_name: e.normalized_name,
      category: e.category || 'Outros',
    }));

    const legacyResponse = await client
      .from('product_dictionary')
      .upsert(legacyRows, { onConflict: 'key' });

    error = legacyResponse.error;
  }

  if (error) throw error;
}
