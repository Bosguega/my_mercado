/**
 * Database Debug Helper
 * Ajuda a diagnosticar problemas de sincronização com Supabase
 */

import { supabase } from '../services/supabaseClient';

export async function debugDatabaseConnection() {
  console.group('🔍 Database Debug Info');

  try {
    // 1. Verificar se Supabase está configurado
    if (!supabase) {
      console.error('❌ Supabase não configurado');
      return false;
    }

    console.log('✅ Supabase client configurado');

    // 2. Verificar usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Usuário não autenticado:', authError);
      return false;
    }

    console.log('✅ Usuário autenticado:', user.id);
    console.log('✅ Email:', user.email);

    // 3. Testar acesso à tabela receipts
    console.log('🔍 Testando acesso à tabela receipts...');

    const { data: receiptsData, error: receiptsError } = await supabase
      .from('receipts')
      .select('id, establishment, date, created_at')
      .eq('user_id', user.id)
      .limit(1);

    if (receiptsError) {
      console.error('❌ Erro ao acessar receipts:', receiptsError);

      // Verificar se é erro de permissão (RLS)
      if (receiptsError.code === '42501' || receiptsError.message.includes('permission denied')) {
        console.error('🚨 Problema de RLS (Row Level Security)');
        console.error('   Verifique as políticas de acesso no Supabase');
      }

      return false;
    }

    console.log('✅ Acesso à tabela receipts OK');
    console.log('📊 Registros encontrados:', receiptsData?.length || 0);

    // 4. Testar acesso à tabela dictionary
    console.log('🔍 Testando acesso à tabela dictionary...');

    const { data: dictData, error: dictError } = await supabase
      .from('dictionary')
      .select('key, normalized_name')
      .eq('user_id', user.id)
      .limit(1);

    if (dictError) {
      console.error('❌ Erro ao acessar dictionary:', dictError);
      return false;
    }

    console.log('✅ Acesso à tabela dictionary OK');
    console.log('📊 Registros encontrados:', dictData?.length || 0);

    // 5. Testar acesso à tabela canonical_products
    console.log('🔍 Testando acesso à tabela canonical_products...');

    const { data: cpData, error: cpError } = await supabase
      .from('canonical_products')
      .select('id, name, slug')
      .limit(1);

    if (cpError) {
      console.error('❌ Erro ao acessar canonical_products:', cpError);
      return false;
    }

    console.log('✅ Acesso à tabela canonical_products OK');
    console.log('📊 Registros encontrados:', cpData?.length || 0);

    console.log('🎉 Todas as verificações passaram!');
    return true;

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    return false;
  } finally {
    console.groupEnd();
  }
}

export async function testReceiptInsert() {
  console.group('🧪 Teste de Insert Receipt');

  try {
    if (!supabase) {
      console.error('❌ Supabase não configurado');
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Usuário não autenticado');
      return false;
    }

    // Criar receipt de teste
    const testReceipt = {
      user_id: user.id,
      establishment: 'Teste Debug',
      date: new Date().toISOString(),
      items: []
    };

    const { data, error } = await supabase
      .from('receipts')
      .insert(testReceipt)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao inserir receipt:', error);
      return false;
    }

    console.log('✅ Insert OK:', data);

    // Limpar receipt de teste
    await supabase
      .from('receipts')
      .delete()
      .eq('id', data.id);

    console.log('🧹 Teste limpo');
    return true;

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return false;
  } finally {
    console.groupEnd();
  }
}

// Adicionar ao window para debug manual
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).debugDB = debugDatabaseConnection;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).testInsert = testReceiptInsert;
}
