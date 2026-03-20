import { supabase } from './supabaseClient';

export async function getAllReceiptsFromDB() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return data.map((row) => ({
    id: row.id,
    establishment: row.establishment,
    date: row.date,
    items: typeof row.items_json === 'string' ? JSON.parse(row.items_json) : (row.items_json || [])
  }));
}

export async function insertReceiptToDB(receipt) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error("Usuário não autenticado");

  const { error } = await supabase.from('receipts').upsert([{
    id: receipt.id,
    user_id: userData.user.id,
    establishment: receipt.establishment,
    date: receipt.date,
    items_json: receipt.items
  }]);

  if (error) throw error;
  return true;
}

export async function deleteReceiptFromDB(id) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error("Usuário não autenticado");

  const { error } = await supabase.from('receipts').delete().eq('id', id).eq('user_id', userData.user.id);
  if (error) throw error;
  return true;
}

export async function restoreReceiptsToDB(receipts) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error("Usuário não autenticado");

  // Clear all for this user
  const { error: deleteError } = await supabase.from('receipts').delete().eq('user_id', userData.user.id);
  if (deleteError) throw deleteError;

  // Insert all
  const rows = receipts.map((r) => ({
    id: r.id,
    user_id: userData.user.id,
    establishment: r.establishment,
    date: r.date,
    items_json: r.items,
  }));
  
  const { error: insertError } = await supabase.from('receipts').insert(rows);
  if (insertError) throw insertError;
  return true;
}
