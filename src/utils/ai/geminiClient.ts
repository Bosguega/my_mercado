/**
 * Google AI Studio (Gemini) Client
 *
 * Cliente para integração com API do Google Gemini
 */

import { buildNormalizationPrompt, parseAiJsonResponse } from "./promptBuilder";
import type { AiNormalizationInput, AiNormalizationResult } from "../../types/ai";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

/**
 * Chama a API do Gemini para normalizar itens
 */
export async function callGemini(
  items: AiNormalizationInput[],
  apiKey: string,
  model: string,
): Promise<AiNormalizationResult[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildNormalizationPrompt(items) }] }],
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

  return parseAiJsonResponse(text);
}

/**
 * Testa conexão com a API do Gemini
 */
export async function testGeminiConnection(
  apiKey: string,
  model: string,
): Promise<{ success: boolean; error?: string }> {
  const testItems: AiNormalizationInput[] = [{ key: "TEST", raw: "ARROZ BRANCO 5KG" }];

  try {
    await callGemini(testItems, apiKey, model);
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
    return { success: false, error: errorMessage };
  }
}
