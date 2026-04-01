/**
 * AI Client - unified entry point for calling the AI model.
 * Supports Google AI Studio (Gemini) and OpenAI-compatible APIs.
 */

import { getApiKey, getApiModel, detectProvider } from "./aiConfig";
import { CATEGORIES } from "../constants/domain";
import type { AiNormalizationInput, AiNormalizationResult } from "../types/ai";

// ==============================
// PROMPT
// ==============================

function buildPrompt(items: AiNormalizationInput[]): string {
  const list = items.map((i) => `- key: "${i.key}", raw: "${i.raw}"`).join("\n");
  const categoriesList = CATEGORIES.join(", ");

  return `Voce e um especialista em normalizar nomes de produtos de supermercado brasileiro.
Para cada item abaixo, converta o nome bruto (muitas vezes abreviado e em letras maiusculas) em um nome amigavel, legivel e bem formatado.

REGRAS:
1. MANTENHA volumes e pesos (ex: 1L, 2L, 350ml, 500g, 5kg, 1.5L).
2. MANTENHA variantes importantes (ex: Zero, Integral, Desnatado, Sem Lactose, Diet, Light).
3. Converta abreviacoes comuns para o nome completo (ex: "CERV" -> "Cerveja", "LTA" -> "Lata", "BISC" -> "Biscoito", "REFR" -> "Refrigerante").
4. Use Title Case (Primeira Letra Maiuscula).
5. Categorize em: ${categoriesList}.
6. IDENTIFIQUE a marca (Brand) se houver (ex: Nestlé, Brahma). Se não houver, use null.
7. GERE um slug único simplificado (ex: arroz_tio_joao_5kg).

EXEMPLOS:
- "CERV BRAHMA LTA 350ML" -> {"key": "...", "normalized_name": "Cerveja Brahma Lata 350ml", "category": "Bebidas", "brand": "Brahma", "slug": "cerveja_brahma_350ml"}
- "LEITE PIRACANJUBA INT 1L" -> {"key": "...", "normalized_name": "Leite Piracanjuba Integral 1L", "category": "Laticinios", "brand": "Piracanjuba", "slug": "leite_piracanjuba_integral_1l"}

Itens para processar:
${list}

Responda SOMENTE com o JSON array no formato: [{"key": "...", "normalized_name": "...", "category": "...", "brand": "...", "slug": "..."}], sem explicacoes.`;
}

// ==============================
// GOOGLE AI STUDIO (GEMINI)
// ==============================

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

async function callGemini(
  items: AiNormalizationInput[],
  apiKey: string,
  model: string,
): Promise<AiNormalizationResult[]> {
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

  const data = (await res.json()) as GeminiResponse;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return parseJsonFromText(text);
}

// ==============================
// OPENAI
// ==============================

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

async function callOpenAI(
  items: AiNormalizationInput[],
  apiKey: string,
  model: string,
): Promise<AiNormalizationResult[]> {
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
            "Voce e um especialista em normalizar nomes de produtos de supermercado brasileiro. Responda SOMENTE com JSON.",
        },
        { role: "user", content: buildPrompt(items) },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API Error (${res.status}): ${err}`);
  }

  const data = (await res.json()) as OpenAIResponse;
  const text = data?.choices?.[0]?.message?.content || "";

  return parseJsonFromText(text);
}

// ==============================
// PARSE HELPER
// ==============================

function parseJsonFromText(text: string): AiNormalizationResult[] {
  // Remove possible markdown ```json ... ``` wrapper
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("Resposta da IA nao e um array.");
    }

    return parsed.map((entry) => {
      if (entry && typeof entry === "object") {
        const value = entry as Record<string, unknown>;
        return {
          key: String(value.key ?? ""),
          normalized_name: String(value.normalized_name ?? ""),
          category: String(value.category ?? "Outros"),
          brand: value.brand ? String(value.brand) : undefined,
          slug: value.slug ? String(value.slug) : undefined,
        };
      }

      return {
        key: "",
        normalized_name: "",
        category: "Outros",
      };
    });
  } catch (err) {
    console.error("Erro ao parsear resposta da IA:", err, "\nTexto:", text);
    throw new Error("Resposta da IA nao e um JSON valido.");
  }
}

// ==============================
// MAIN EXPORTS
// ==============================

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls the AI provider to normalize a list of items.
 * Includes automatic retry with exponential backoff.
 */
export async function callAI(
  items: AiNormalizationInput[],
): Promise<AiNormalizationResult[]> {
  const apiKey = getApiKey();
  const model = getApiModel();

  if (!apiKey) {
    throw new Error("API Key nao configurada. Va em configuracoes e informe sua chave.");
  }

  const provider = detectProvider(apiKey);

  // Retry logic with exponential backoff
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.warn(`[AI] Tentativa ${attempt + 1}/${MAX_RETRIES + 1}...`);
        await delay(RETRY_DELAY * attempt); // Exponential backoff
      }

      if (provider === "Google AI Studio") {
        return await callGemini(items, apiKey, model);
      }

      if (provider === "OpenAI") {
        return await callOpenAI(items, apiKey, model);
      }

      throw new Error(
        "Provedor desconhecido para a chave fornecida. Prefixos suportados: AIza... (Google) ou sk-... (OpenAI).",
      );
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[AI] Erro na tentativa ${attempt + 1}:`, lastError.message);
      
      // Don't retry on client errors (4xx)
      if (lastError.message.includes("400") || lastError.message.includes("401")) {
        break;
      }
    }
  }

  // All retries failed - return fallback
  console.error("[AI] Todas as tentativas falharam, usando fallback");
  return items.map((item) => ({
    key: item.key,
    normalized_name: item.raw,
    category: "Outros",
  }));
}

/**
 * Tests AI connection.
 */
export async function testAiConnection(apiKey: string, model: string): Promise<boolean> {
  if (!apiKey) return false;

  const provider = detectProvider(apiKey);
  const testItems: AiNormalizationInput[] = [{ key: "TEST", raw: "ARROZ BRANCO 5KG" }];

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
    console.warn("Teste de conexao falhou:", err);
    return false;
  }
}
