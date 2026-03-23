/**
 * AI Client — unified entry point for calling the AI model.
 * Supports Google AI Studio (Gemini) and OpenAI-compatible APIs.
 */

import { getApiKey, getApiModel, detectProvider } from "./aiConfig";

// ==============================
// 📝 PROMPT
// ==============================

function buildPrompt(items) {
  const list = items.map((i) => `- key: "${i.key}", raw: "${i.raw}"`).join("\n");

  return `Você é um especialista em produtos de supermercado brasileiro.
Para cada item abaixo, retorne um JSON array com objetos contendo:
- "key": a mesma key recebida
- "normalized_name": nome do produto limpo e legível (ex: "Leite Integral Piracanjuba 1L")
- "category": uma entre: Açougue, Hortifruti, Laticínios, Padaria, Limpeza, Higiene, Bebidas, Mercearia, Petshop, Outros

Itens:
${list}

Responda SOMENTE com o JSON array, sem explicações.`;
}

// ==============================
// 🔮 GOOGLE AI STUDIO (GEMINI)
// ==============================

async function callGemini(items, apiKey, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(items) }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API Error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return parseJsonFromText(text);
}

// ==============================
// 🤖 OPENAI
// ==============================

async function callOpenAI(items, apiKey, model) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content:
            "Você é um especialista em normalizar nomes de produtos de supermercado brasileiro. Responda SOMENTE com JSON.",
        },
        { role: "user", content: buildPrompt(items) },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API Error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";

  return parseJsonFromText(text);
}

// ==============================
// 🧹 PARSE HELPER
// ==============================

function parseJsonFromText(text) {
  // Remove possível markdown ```json ... ``` wrapper
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      throw new Error("Resposta da IA não é um array.");
    }
    return parsed;
  } catch (err) {
    console.error("Erro ao parsear resposta da IA:", err, "\nTexto:", text);
    throw new Error("Resposta da IA não é um JSON válido.");
  }
}

// ==============================
// 🚀 EXPORT PRINCIPAL
// ==============================

/**
 * Chama a IA configurada para normalizar uma lista de itens.
 * @param {Array<{key: string, raw: string}>} items
 * @returns {Promise<Array<{key: string, normalized_name: string, category: string}>>}
 */
export async function callAI(items) {
  const apiKey = getApiKey();
  const model = getApiModel();

  if (!apiKey) {
    throw new Error("API Key não configurada. Vá em ⚙️ e configure sua chave.");
  }

  const provider = detectProvider(apiKey);

  if (provider === "Google AI Studio") {
    return callGemini(items, apiKey, model);
  }

  if (provider === "OpenAI") {
    return callOpenAI(items, apiKey, model);
  }

  throw new Error(`Provedor desconhecido para a chave fornecida. Prefixos suportados: AIza... (Google) ou sk-... (OpenAI).`);
}

/**
 * Testa a conexão com a IA.
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<boolean>}
 */
export async function testAiConnection(apiKey, model) {
  if (!apiKey) return false;

  const provider = detectProvider(apiKey);
  const testItems = [{ key: "TEST", raw: "ARROZ BRANCO 5KG" }];

  try {
    if (provider === "Google AI Studio") {
      await callGemini(testItems, apiKey, model);
    } else if (provider === "OpenAI") {
      await callOpenAI(testItems, apiKey, model);
    } else {
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Teste de conexão falhou:", err);
    return false;
  }
}
