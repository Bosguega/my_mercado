/**
 * AI Configuration Utils
 *
 * Armazena a API key do usuário em sessionStorage (sem criptografia).
 *
 * Segurança: criptografar com uma chave fixa hardcoded no bundle não oferece
 * proteção real — qualquer pessoa com acesso ao bundle já conhece a chave.
 * sessionStorage é a abordagem mais honesta: a key existe apenas enquanto a aba
 * estiver aberta e é apagada automaticamente ao fechar o navegador.
 *
 * O modelo selecionado (sem dados sensíveis) é salvo em localStorage para
 * persistir entre sessões.
 */

const SESSION_KEY = "ai_key";
const MODEL_KEY = "ai_model";

function getStorage(type: "session" | "local"): Storage | null {
  if (typeof window === "undefined") return null;
  return type === "session" ? window.sessionStorage : window.localStorage;
}

/**
 * Migra chave legada salva em localStorage com criptografia AES (CryptoJS).
 * Ciphertexts do CryptoJS começam com "U2F" (base64 de "Salted__").
 * Se o valor parecer texto cifrado, descartamos — não é possível descriptografar
 * sem a dependência CryptoJS. O usuário precisará reinserir a chave.
 * Remove a entrada antiga após leitura.
 */
function migrateLegacyKey(): string | null {
  const local = getStorage("local");
  if (!local) return null;
  const raw = local.getItem("ai_key");
  if (!raw) return null;
  local.removeItem("ai_key");
  // Ciphertext CryptoJS começa com "U2F" — descartamos silenciosamente.
  if (raw.startsWith("U2F")) return null;
  return raw.trim() || null;
}

/**
 * Recupera a API Key da sessão atual.
 * Na primeira chamada, tenta migrar chave legada do localStorage.
 */
export function getApiKey(): string | null {
  const session = getStorage("session");
  if (!session) return null;

  const existing = session.getItem(SESSION_KEY);
  if (existing) return existing;

  // Tentativa de migração única (chave antiga em localStorage)
  const legacy = migrateLegacyKey();
  if (legacy) {
    session.setItem(SESSION_KEY, legacy);
    return legacy;
  }

  return null;
}

/**
 * Salva a API Key na sessão atual (limpa ao fechar a aba).
 */
export function setApiKey(key: string | null | undefined) {
  const session = getStorage("session");
  if (!session) return;

  if (key?.trim()) {
    session.setItem(SESSION_KEY, key.trim());
  } else {
    session.removeItem(SESSION_KEY);
  }
}

/**
 * Recupera o modelo salvo (persiste entre sessões — não é dado sensível).
 */
export function getApiModel(): string {
  const local = getStorage("local");
  return local?.getItem(MODEL_KEY) || "gemini-2.5-flash-lite";
}

/**
 * Salva o modelo selecionado no localStorage.
 */
export function setApiModel(model: string) {
  const local = getStorage("local");
  local?.setItem(MODEL_KEY, model);
}

/**
 * Detecta o provedor AI com base no prefixo da chave.
 */
export function detectProvider(key: string | null | undefined): string {
  if (!key) return "Nenhum";
  if (key.startsWith("AIza")) return "Google AI Studio";
  if (key.startsWith("sk-")) return "OpenAI";
  return "Desconhecido";
}
