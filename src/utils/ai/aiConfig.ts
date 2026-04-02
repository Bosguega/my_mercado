/**
 * AI Configuration Utils
 * Handles storage of the AI API key in sessionStorage.
 */

const STORAGE_KEY = "ai_key";
const MODEL_KEY = "ai_model";

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

/**
 * Recupera a API Key da sessao atual.
 * Se existir chave legada no localStorage, migra para sessionStorage.
 */
export function getApiKey(): string | null {
  const session = getSessionStorage();
  if (!session) return null;

  const inSession = session.getItem(STORAGE_KEY);
  if (inSession) return inSession;

  const local = getLocalStorage();
  const legacy = local?.getItem(STORAGE_KEY) ?? null;
  if (legacy) {
    session.setItem(STORAGE_KEY, legacy);
    local?.removeItem(STORAGE_KEY);
    return legacy;
  }

  return null;
}

/**
 * Salva a API Key no sessionStorage.
 */
export function setApiKey(key: string | null | undefined) {
  const session = getSessionStorage();
  const local = getLocalStorage();
  if (!session) return;

  if (key) {
    session.setItem(STORAGE_KEY, key.trim());
    local?.removeItem(STORAGE_KEY);
  } else {
    session.removeItem(STORAGE_KEY);
    local?.removeItem(STORAGE_KEY);
  }
}

/**
 * Recupera o modelo salvo no localStorage.
 */
export function getApiModel(): string {
  return localStorage.getItem(MODEL_KEY) || "gemini-2.5-flash-lite";
}

/**
 * Salva o modelo no localStorage.
 */
export function setApiModel(model: string) {
  localStorage.setItem(MODEL_KEY, model);
}

/**
 * Detecta o provedor básico da chave.
 */
export function detectProvider(key: string | null | undefined): string {
  if (!key) return "Nenhum";
  if (key.startsWith("AIza")) return "Google AI Studio";
  if (key.startsWith("sk-")) return "OpenAI";
  return "Desconhecido";
}
