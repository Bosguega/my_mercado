/**
 * fetch-nfce — cache (Postgres), rate limit, retries, logs.
 * Contrato de resposta mantido: sucesso { success, html, source, status } | erro { success: false, error, message, status }.
 */
/// <reference path="../edge-runtime.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_HOST_SUFFIX = "fazenda.sp.gov.br";
const FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_CHARS = 2_000_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RETRY_DELAY_MS = 400;
const MAX_FETCH_ATTEMPTS = 3;

const RATE_LIMIT_IP_PER_MINUTE = 45;
const RATE_LIMIT_USER_PER_MINUTE = 80;

/**
 * Throttle do cleanup em memória do worker Deno.
 * Evita chamar o banco em toda requisição — o worker reutiliza a variável
 * enquanto estiver vivo (tipicamente minutos a horas em produção).
 */
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos
let lastCleanupAt = 0;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SuccessBody = {
  success: true;
  html: string;
  source: "sefaz" | "cache";
  status: number;
};

type ErrorBody = {
  success: false;
  error: string;
  message: string;
  status: number;
};

function json(body: SuccessBody | ErrorBody, httpStatus: number): Response {
  return new Response(JSON.stringify(body), {
    status: httpStatus,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validateNfceUrl(rawUrl: unknown): { ok: true; url: URL } | { ok: false; body: ErrorBody } {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return {
      ok: false,
      body: {
        success: false,
        error: "INVALID_INPUT",
        message: "Informe uma URL válida no campo url.",
        status: 400,
      },
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return {
      ok: false,
      body: {
        success: false,
        error: "INVALID_URL",
        message: "URL não reconhecida.",
        status: 400,
      },
    };
  }

  if (parsed.protocol !== "https:") {
    return {
      ok: false,
      body: {
        success: false,
        error: "INVALID_PROTOCOL",
        message: "Somente HTTPS é permitido.",
        status: 400,
      },
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host.endsWith(ALLOWED_HOST_SUFFIX)) {
    return {
      ok: false,
      body: {
        success: false,
        error: "HOST_NOT_ALLOWED",
        message: `Host não permitido. Permitido: *.${ALLOWED_HOST_SUFFIX}`,
        status: 400,
      },
    };
  }

  if (!parsed.searchParams.has("p") && !parsed.searchParams.has("chNFe")) {
    return {
      ok: false,
      body: {
        success: false,
        error: "MISSING_QUERY",
        message: "Link sem parâmetros esperados (p ou chNFe).",
        status: 400,
      },
    };
  }

  return { ok: true, url: parsed };
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * Decodifica o campo `sub` do JWT para usar como chave de rate-limit por usuário.
 *
 * ⚠️ ATENÇÃO: Esta função NÃO verifica a assinatura do token.
 * Ela é usada EXCLUSIVAMENTE para rate-limiting por userId, não para autenticação.
 * A autenticação real já foi feita pelo gateway do Supabase antes desta função ser
 * chamada. Um atacante que forje o sub do JWT poderá alterar seu bucket de
 * rate-limit de usuário, mas o limite por IP permanece intacto como segunda barreira.
 */
function decodeJwtSub(req: Request): string | null {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);
    const payload = JSON.parse(atob(base64)) as { sub?: string };
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type SefazOk = { ok: true; html: string; status: number };
type SefazErr = { ok: false; body: ErrorBody };
type SefazResult = SefazOk | SefazErr;

async function fetchSefazOnce(targetUrl: string): Promise<SefazResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      return {
        ok: false,
        body: {
          success: false,
          error: "REDIRECT_NOT_ALLOWED",
          message: "Redirecionamento bloqueado pela política de segurança.",
          status: res.status,
        },
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        body: {
          success: false,
          error: "UPSTREAM_ERROR",
          message: `Sefaz retornou HTTP ${res.status}.`,
          status: res.status,
        },
      };
    }

    const html = await res.text();

    if (html.length > MAX_HTML_CHARS) {
      return {
        ok: false,
        body: {
          success: false,
          error: "RESPONSE_TOO_LARGE",
          message: `Resposta excede o limite de ${MAX_HTML_CHARS} caracteres.`,
          status: 413,
        },
      };
    }

    if (!html.includes("tabResult") && !html.includes("txtTopo")) {
      return {
        ok: false,
        body: {
          success: false,
          error: "INVALID_NFCE_HTML",
          message: "Resposta não contém o HTML esperado da NFC-e.",
          status: 502,
        },
      };
    }

    return { ok: true, html, status: res.status };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "AbortError") {
      return {
        ok: false,
        body: {
          success: false,
          error: "TIMEOUT",
          message: `Tempo esgotado após ${FETCH_TIMEOUT_MS}ms.`,
          status: 504,
        },
      };
    }
    return {
      ok: false,
      body: {
        success: false,
        error: "FETCH_FAILED",
        message: e instanceof Error ? e.message : "Falha ao contatar o Sefaz.",
        status: 502,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function shouldRetrySefaz(last: SefazErr): boolean {
  const { error, status } = last.body;
  if (error === "REDIRECT_NOT_ALLOWED") return false;
  if (error === "RESPONSE_TOO_LARGE") return false;
  if (error === "INVALID_NFCE_HTML") return false;
  if (error === "UPSTREAM_ERROR" && status >= 400 && status < 500 && status !== 429) {
    return false;
  }
  if (error === "TIMEOUT") return true;
  if (error === "FETCH_FAILED") return true;
  if (error === "UPSTREAM_ERROR" && (status >= 500 || status === 429)) return true;
  return false;
}

async function fetchSefazWithRetries(targetUrl: string): Promise<SefazResult> {
  let last: SefazResult | null = null;

  for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS * attempt);
    }
    const result = await fetchSefazOnce(targetUrl);
    if (result.ok) return result;
    last = result;
    if (!shouldRetrySefaz(result)) return result;
  }

  return last ?? {
    ok: false,
    body: {
      success: false,
      error: "FETCH_FAILED",
      message: "Falha após tentativas.",
      status: 502,
    },
  };
}

async function tryRateLimit(
  supabase: ReturnType<typeof createClient>,
  ip: string,
  userId: string | null,
): Promise<{ ok: true } | { ok: false; body: ErrorBody }> {
  const windowId = Math.floor(Date.now() / 60_000);

  const { data: ipAllowed, error: ipErr } = await supabase.rpc("nfce_check_and_increment_rate", {
    p_rate_key: `ip:${ip}`,
    p_window_id: windowId,
    p_limit: RATE_LIMIT_IP_PER_MINUTE,
  });

  if (ipErr) {
    console.warn(JSON.stringify({ event: "nfce_rate_ip_check_failed", message: ipErr.message }));
  } else if (ipAllowed === false) {
    return {
      ok: false,
      body: {
        success: false,
        error: "RATE_LIMITED",
        message: "Muitas consultas deste endereço. Tente novamente em até um minuto.",
        status: 429,
      },
    };
  }

  if (userId) {
    const { data: userAllowed, error: userErr } = await supabase.rpc("nfce_check_and_increment_rate", {
      p_rate_key: `user:${userId}`,
      p_window_id: windowId,
      p_limit: RATE_LIMIT_USER_PER_MINUTE,
    });

    if (userErr) {
      console.warn(JSON.stringify({ event: "nfce_rate_user_check_failed", message: userErr.message }));
    } else if (userAllowed === false) {
      return {
        ok: false,
        body: {
          success: false,
          error: "RATE_LIMITED",
          message: "Limite de consultas por usuário excedido. Aguarde um minuto.",
          status: 429,
        },
      };
    }
  }

  return { ok: true };
}

async function readCache(
  supabase: ReturnType<typeof createClient>,
  urlHash: string,
): Promise<{ html: string; upstream_status: number } | null> {
  const { data, error } = await supabase
    .from("nfce_fetch_cache")
    .select("html, upstream_status")
    .eq("url_hash", urlHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.warn(JSON.stringify({ event: "nfce_cache_read_failed", message: error.message }));
    return null;
  }
  if (!data?.html) return null;
  return { html: data.html, upstream_status: data.upstream_status ?? 200 };
}

async function writeCache(
  supabase: ReturnType<typeof createClient>,
  urlHash: string,
  urlNormalized: string,
  html: string,
  upstreamStatus: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
  const { error } = await supabase.from("nfce_fetch_cache").upsert(
    {
      url_hash: urlHash,
      url_normalized: urlNormalized,
      html,
      upstream_status: upstreamStatus,
      expires_at: expiresAt,
    },
    { onConflict: "url_hash" },
  );

  if (error) {
    console.warn(JSON.stringify({ event: "nfce_cache_write_failed", message: error.message }));
  }
}

/** Throttle no banco (~10 min): remove cache expirado, janelas de rate antigas, logs >30d. */
async function tryCleanupStale(supabase: ReturnType<typeof createClient>): Promise<void> {
  const { error } = await supabase.rpc("nfce_cleanup_stale");
  if (error) {
    console.warn(JSON.stringify({ event: "nfce_cleanup_failed", message: error.message }));
  }
}

async function writeLog(
  supabase: ReturnType<typeof createClient>,
  row: {
    url_hash: string;
    user_id: string | null;
    client_ip: string;
    cache_hit: boolean;
    success: boolean;
    error_code: string | null;
    upstream_status: number | null;
    duration_ms: number;
  },
): Promise<void> {
  const { error } = await supabase.from("nfce_fetch_log").insert(row);
  if (error) {
    console.warn(JSON.stringify({ event: "nfce_log_write_failed", message: error.message }));
  }
}

Deno.serve(async (req: Request) => {
  const t0 = Date.now();

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(
      {
        success: false,
        error: "METHOD_NOT_ALLOWED",
        message: "Use POST com JSON { url }.",
        status: 405,
      },
      405,
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json(
      {
        success: false,
        error: "INVALID_JSON",
        message: "Corpo da requisição deve ser JSON.",
        status: 400,
      },
      400,
    );
  }

  const urlField =
    typeof payload === "object" && payload !== null && "url" in payload
      ? (payload as { url: unknown }).url
      : undefined;

  const validated = validateNfceUrl(urlField);
  if (!validated.ok) {
    return json(validated.body, 200);
  }

  const targetUrl = validated.url.toString();
  const urlHash = await sha256Hex(targetUrl);
  const clientIp = getClientIp(req);
  const userId = decodeJwtSub(req);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

  const finish = async (
    body: SuccessBody | ErrorBody,
    opts: { cacheHit: boolean },
  ): Promise<Response> => {
    if (supabase) {
      await writeLog(supabase, {
        url_hash: urlHash,
        user_id: userId,
        client_ip: clientIp,
        cache_hit: opts.cacheHit,
        success: body.success,
        error_code: body.success ? null : body.error,
        upstream_status: body.status,
        duration_ms: Date.now() - t0,
      });
    }

    console.log(
      JSON.stringify({
        event: "nfce_fetch_done",
        url_hash: urlHash,
        cache_hit: opts.cacheHit,
        success: body.success,
        error: body.success ? undefined : body.error,
        duration_ms: Date.now() - t0,
      }),
    );

    return json(body, 200);
  };

  if (!supabase) {
    console.warn(JSON.stringify({ event: "nfce_no_supabase_env", message: "cache/rate/log desativados" }));
    const live = await fetchSefazWithRetries(targetUrl);
    if (live.ok) {
      return finish(
        { success: true, html: live.html, source: "sefaz", status: live.status },
        { cacheHit: false },
      );
    }
    return finish(live.body, { cacheHit: false });
  }


  // Cleanup com throttle: evita call ao banco em toda requisição
  const now = Date.now();
  if (now - lastCleanupAt > CLEANUP_INTERVAL_MS) {
    lastCleanupAt = now;
    // Fire-and-forget: não aguarda para não adicionar latência
    tryCleanupStale(supabase).catch((e: unknown) =>
      console.warn(JSON.stringify({ event: "nfce_cleanup_unhandled", error: String(e) })),
    );
  }

  const rate = await tryRateLimit(supabase, clientIp, userId);
  if (!rate.ok) {
    return finish(rate.body, { cacheHit: false });
  }

  const cached = await readCache(supabase, urlHash);
  if (cached) {
    return finish(
      {
        success: true,
        html: cached.html,
        source: "cache",
        status: cached.upstream_status,
      },
      { cacheHit: true },
    );
  }

  const live = await fetchSefazWithRetries(targetUrl);
  if (live.ok) {
    await writeCache(supabase, urlHash, targetUrl, live.html, live.status);
    return finish(
      { success: true, html: live.html, source: "sefaz", status: live.status },
      { cacheHit: false },
    );
  }

  return finish(live.body, { cacheHit: false });
});
