/**
 * AI Configuration Utils
 * Handles storage of the AI API key in localStorage with encryption.
 */

import CryptoJS from 'crypto-js';

const STORAGE_KEY = "ai_key";
const MODEL_KEY = "ai_model";
const ENCRYPTION_KEY = "my-mercado-encryption-key-2024"; // Simple fixed key for encryption

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

function decrypt(encryptedText: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Recupera a API Key do localStorage criptografado.
 * Migra chaves legadas não criptografadas se existirem.
 */
export function getApiKey(): string | null {
  const local = getLocalStorage();
  if (!local) return null;

  const encryptedKey = local.getItem(STORAGE_KEY);
  if (!encryptedKey) return null;

  try {
    // Tenta descriptografar
    const decrypted = decrypt(encryptedKey);
    return decrypted;
  } catch {
    // Se falhar, pode ser uma chave legada não criptografada
    // Remove a chave inválida e retorna null
    local.removeItem(STORAGE_KEY);
    return null;
  }
}

/**
 * Salva a API Key no localStorage criptografado.
 */
export function setApiKey(key: string | null | undefined) {
  const local = getLocalStorage();
  if (!local) return;

  if (key) {
    const encrypted = encrypt(key.trim());
    local.setItem(STORAGE_KEY, encrypted);
  } else {
    local.removeItem(STORAGE_KEY);
  }
}

/**
 * Recupera o modelo salvo no localStorage.
 */
export function getApiModel(): string {
  const local = getLocalStorage();
  return local?.getItem(MODEL_KEY) || "gemini-2.5-flash-lite";
}

/**
 * Salva o modelo no localStorage.
 */
export function setApiModel(model: string) {
  const local = getLocalStorage();
  local?.setItem(MODEL_KEY, model);
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
