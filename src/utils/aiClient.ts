/**
 * AI Client - unified entry point for calling the AI model.
 * Supports Google AI Studio (Gemini) and OpenAI-compatible APIs.
 */

import { getApiKey, getApiModel, detectProvider } from "./aiConfig";
import type { AiNormalizationInput, AiNormalizationResult } from "../types/ai";

// ==============================
// PROMPT
// ==============================

function buildPrompt(items: AiNormalizationInput[]): string {
  const list = items.map((i) => `- key: "${i.key}", raw: "${i.raw}"`).join("\n");

  return `Voce e um especialista em normalizar nomes de produtos de supermercado brasileiro.
Para cada item abaixo, converta o nome bruto (muitas vezes abreviado e em letras maiusculas) em um nome amigavel, legivel e bem formatado.

REGRAS:
1. MANTENHA volumes e pesos (ex: 1L, 2L, 350ml, 500g, 5kg, 1.5L).
2. MANTENHA variantes importantes (ex: Zero, Integral, Desnatado, Sem Lactose, Diet, Light).
3. Converta abreviacoes comuns para o nome completo (ex: "CERV" -> "Cerveja", "LTA" -> "Lata", "BISC" -> "Biscoito", "REFR" -> "Refrigerante").
4. Use Title Case (Primeira Letra Maiuscula).
5. Categorize em: Acougue, Hortifruti, Laticinios, Padaria, Limpeza, Higiene, Bebidas, Mercearia, Petshop, Outros.

EXEMPLOS:
- "CERV BRAHMA LTA 350ML" -> "Cerveja Brahma Lata 350ml" (Bebidas)
- "LEITE PIRACANJUBA INT 1L" -> "Leite Piracanjuba Integral 1L" (Laticinios)
- "COCA COLA ZERO 2L" -> "Coca-Cola Zero 2L" (Bebidas)
- "TOMATE ITALIA" -> "Tomate Italiano" (Hortifruti)
- "BISC RECHEADO TRAKINAS 126G" -> "Biscoito Recheado Trakinas 126g" (Mercearia)

Itens para processar:
${list}

Responda SOMENTE com o JSON array no formato: [{"key": "...", "normalized_name": "...", "category": "..."}], sem explicacoes.`;
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

function isAiNormalizationResult(value: unknown): value is AiNormalizationResult {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.key === "string" &&
    typeof candidate.normalized_name === "string" &&
    typeof candidate.category === "string"
  );
}

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
      if (isAiNormalizationResult(entry)) {
        return entry;
      }

      if (entry && typeof entry === "object") {
        const value = entry as Record<string, unknown>;
        return {
          key: String(value.key ?? ""),
          normalized_name: String(value.normalized_name ?? ""),
          category: String(value.category ?? "Outros"),
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

/**
 * Calls the configured AI provider to normalize a list of items.
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

  if (provider === "Google AI Studio") {
    return callGemini(items, apiKey, model);
  }

  if (provider === "OpenAI") {
    return callOpenAI(items, apiKey, model);
  }

  throw new Error(
    "Provedor desconhecido para a chave fornecida. Prefixos suportados: AIza... (Google) ou sk-... (OpenAI).",
  );
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
