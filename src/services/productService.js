import { supabase } from './supabaseClient';
import { getApiKey, getApiModel } from '../utils/aiConfig';

/**
 * UTILS - Normalização de chaves para o dicionário
 */
export function normalizeKey(name) {
  if (!name) return '';

  return name
    .toUpperCase()
    // Remover unidades comuns e medidas (KG, G, ML, L, UN, FD, CX)
    .replace(/\b(KG|G|ML|L|UN|FD|CX|C\/|X)\b/g, '')
    // Remover números e caracteres especiais (exceto espaços)
    .replace(/[0-9]/g, '')
    .replace(/[^\w\s]/gi, '')
    // Colapsar múltiplos espaços
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * DICIONÁRIO - Busca chaves existentes no banco
 */
export async function getDictionary(keys) {
  if (!keys || keys.length === 0) return {};

  const { data, error } = await supabase
    .from('product_dictionary')
    .select('key, normalized_name, category')
    .in('key', keys);

  if (error) {
    console.error('Erro ao buscar dicionário:', error);
    return {};
  }

  // Retorna um mapa { key: { normalized_name, category } }
  return (data || []).reduce((acc, row) => {
    acc[row.key] = {
      normalized_name: row.normalized_name,
      category: row.category
    };
    return acc;
  }, {});
}

/**
 * IA - Chamada em lote (máximo 10)
 */
export async function callAI(items) {
  if (!items || items.length === 0) return [];

  const apiKey = getApiKey();
  const selectedModel = getApiModel();

  if (!apiKey) {
    throw new Error("API Key da IA não configurada. Clique no ícone de engrenagem para configurar.");
  }

  // Limite de 10 por lote
  const batch = items.slice(0, 10);

  try {
    let data;
    const isGoogleKey = apiKey.startsWith('AIza');
    
    if (isGoogleKey) {
      // Chamada para GOOGLE GEMINI
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Você é um assistente especialista em compras de mercado. Receba uma lista de itens de nota fiscal (raw) e retorne APENAS um JSON (array de objetos) com: key, normalized_name, category. 
              Categorias permitidas: Açougue, Hortifruti, Laticínios, Padaria, Limpeza, Higiene, Bebidas, Mercearia, Outros.
              Itens: ${JSON.stringify(batch)}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro na API do Google: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      const content = result.candidates[0]?.content?.parts[0]?.text;
      data = JSON.parse(content.trim());
    } else {
      // Chamada para OPENAI (ou compatível como Groq)
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel.includes('gemini') ? 'gpt-3.5-turbo' : selectedModel,
          messages: [
            { 
              role: "system", 
              content: "Você é um assistente especialista em compras de mercado. Receba uma lista de itens de nota fiscal (raw) e retorne um JSON (array de objetos) com: key, normalized_name, category. Categorias permitidas: Açougue, Hortifruti, Laticínios, Padaria, Limpeza, Higiene, Bebidas, Mercearia, Outros." 
            },
            { 
              role: "user", 
              content: JSON.stringify(batch) 
            }
          ],
          temperature: 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro na API da IA: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      let content = result.choices[0]?.message?.content;
      
      // Sanitização para extrair JSON de blocos markdown
      if (content.includes('```json')) {
        content = content.split('```json')[1].split('```')[0];
      } else if (content.includes('```')) {
        content = content.split('```')[1].split('```')[0];
      }
      data = JSON.parse(content.trim());
    }

    // Validação da resposta (Etapa 6)
    if (!Array.isArray(data)) return [];
    
    return data.filter(item => 
      item.key && 
      item.normalized_name && 
      item.category
    );
  } catch (err) {
    console.error('Erro na IA:', err);
    throw err;
  }
}

/**
 * Testar conexão com a IA
 */
export async function testAiConnection(key, model) {
  const isGoogle = key.startsWith('AIza');
  
  try {
    if (isGoogle) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Diga 'OK'" }] }]
        })
      });
      return response.ok;
    } else {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: model.includes('gemini') ? 'gpt-3.5-turbo' : model,
          messages: [{ role: "user", content: "Diga 'OK'" }],
          max_tokens: 5
        })
      });
      return response.ok;
    }
  } catch {
    return false;
  }
}

/**
 * ATUALIZAR DICIONÁRIO (Etapa 7)
 */
export async function updateDictionary(aiResults) {
  if (!aiResults || aiResults.length === 0) return;

  const { error } = await supabase
    .from('product_dictionary')
    .upsert(
      aiResults.map(r => ({
        key: r.key,
        normalized_name: r.normalized_name,
        category: r.category
      })),
      { onConflict: 'key' }
    );

  if (error) {
    console.error('Erro ao atualizar dicionário:', error);
  }
}

/**
 * PIPELINE COMPLETO (Etapa 11)
 */
export async function processItemsPipeline(rawItems) {
  // 1. Normalizar keys
  const itemsWithKey = rawItems.map(item => ({
    ...item,
    normalized_key: normalizeKey(item.name)
  }));

  const keys = [...new Set(itemsWithKey.map(i => i.normalized_key))];

  // 2. Buscar dicionário (conhecidos)
  const dictionary = await getDictionary(keys);

  // 3. Separar conhecidos / desconhecidos
  const knownItems = [];
  const unknownMap = new Map(); // Para evitar duplicados no lote de IA

  itemsWithKey.forEach(item => {
    const dictEntry = dictionary[item.normalized_key];
    if (dictEntry) {
      knownItems.push({
        ...item,
        normalized_name: dictEntry.normalized_name,
        category: dictEntry.category
      });
    } else {
      // Registra no mapa de desconhecidos para IA (evita enviar mesma chave 2x)
      if (!unknownMap.has(item.normalized_key)) {
        unknownMap.set(item.normalized_key, item.name);
      }
    }
  });

  // 4. IA para desconhecidos (em lotes de 10)
  const unknownKeysForAI = Array.from(unknownMap.entries()).map(([key, raw]) => ({ key, raw }));
  let aiResults = [];
  
  // Processamento em lotes (Etapa 10)
  for (let i = 0; i < unknownKeysForAI.length; i += 10) {
    const chunk = unknownKeysForAI.slice(i, i + 10);
    const results = await callAI(chunk);
    aiResults = [...aiResults, ...results];
  }

  // 5. Atualizar dicionário com novos aprendizados
  if (aiResults.length > 0) {
    await updateDictionary(aiResults);
  }

  // 6. Montar itens finais
  const aiResultsMap = aiResults.reduce((acc, r) => {
    acc[r.key] = r;
    return acc;
  }, {});

  const finalItems = itemsWithKey.map(item => {
    const dictEntry = dictionary[item.normalized_key] || aiResultsMap[item.normalized_key];
    
    // Converte valores para números para o banco de dados
    const quantity = parseFloat(String(item.qty).replace(',', '.')) || 1;
    const unitPriceNum = parseFloat(String(item.unitPrice || '0,00').replace(',', '.')) || 0;
    const totalNum = parseFloat(String(item.total || '0,00').replace(',', '.')) || (quantity * unitPriceNum);

    return {
      // Campos originais para a UI (compatibilidade)
      name: item.name,
      qty: item.qty,
      unitPrice: item.unitPrice,
      total: item.total,

      // Novos campos requeridos (Etapa 8)
      normalized_key: item.normalized_key,
      normalized_name: dictEntry ? dictEntry.normalized_name : item.name,
      category: dictEntry ? dictEntry.category : 'Outros',
      quantity,
      unit: item.unit || 'UN',
      price: unitPriceNum // Aqui usamos o preço unitário para 'price'
    };
  });

  return finalItems;
}
