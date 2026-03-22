/**
 * AI Configuration Utils
 * Handles storage of the AI API key in localStorage.
 */

const STORAGE_KEY = "ai_key";
const MODEL_KEY = "ai_model";

/**
 * Recupere a API Key salva no localStorage.
 * @returns {string|null}
 */
export function getApiKey() {
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Salva a API Key no localStorage.
 * @param {string} key 
 */
export function setApiKey(key) {
  if (key) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Recupera o modelo salvo no localStorage.
 */
export function getApiModel() {
  return localStorage.getItem(MODEL_KEY) || "gemini-2.5-flash-lite";
}

/**
 * Salva o modelo no localStorage.
 */
export function setApiModel(model) {
  localStorage.setItem(MODEL_KEY, model);
}

/**
 * Detecta o provedor básico da chave.
 */
export function detectProvider(key) {
  if (!key) return "Nenhum";
  if (key.startsWith("AIza")) return "Google AI Studio";
  if (key.startsWith("sk-")) return "OpenAI";
  return "Desconhecido";
}
