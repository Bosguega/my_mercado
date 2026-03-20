import { supabase } from './supabaseClient';

export async function getAllReceiptsFromDB() {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
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
  const { error } = await supabase.from('receipts').upsert([{
    id: receipt.id,
    establishment: receipt.establishment,
    date: receipt.date,
    items_json: receipt.items
  }]);

  if (error) throw error;
  return true;
}

export async function deleteReceiptFromDB(id) {
  const { error } = await supabase.from('receipts').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function restoreReceiptsToDB(receipts) {
  // Clear all
  const { error: deleteError } = await supabase.from('receipts').delete().neq('id', 'dummy_id');
  if (deleteError) throw deleteError;

  // Insert all
  const rows = receipts.map((r) => ({
    id: r.id,
    establishment: r.establishment,
    date: r.date,
    items_json: r.items,
  }));
  
  const { error: insertError } = await supabase.from('receipts').insert(rows);
  if (insertError) throw insertError;
  return true;
}
