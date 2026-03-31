import type { Receipt, ReceiptItem } from "../types/domain";

const PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
  (url: string) => `https://proxy.cors.sh/${encodeURIComponent(url)}`,
  (url: string) => `https://cors-anywhere.herokuapp.com/${url}`,
];
const PROXY_TIMEOUT_MS = 15000;
const SUPPORTED_HOST_SUFFIX = "fazenda.sp.gov.br";

// ==============================
// Utils
// ==============================

function parseNumber(value: string | null | undefined, fallback = "0"): string {
  if (!value) return fallback;
  return value.replace(/[^\d,.-]/g, "").trim();
}

function normalizeSpaces(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

function toBRDateTime(datePart: string, timePart?: string): string {
  const baseTime = timePart ? timePart.trim() : "";
  const normalizedTime =
    baseTime.length === 5 ? `${baseTime}:00` : baseTime || "00:00:00";
  return `${datePart.trim()} ${normalizedTime}`;
}

function extractEmissionDate(value: string | null | undefined): string | null {
  const text = normalizeSpaces(value);
  if (!text) return null;

  // "Emissao: DD/MM/AAAA HH:mm:ss" (including mojibake variants where "Emiss" is still intact)
  const aroundEmission = text.match(
    /emiss[\s\S]{0,60}?(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?/i,
  );
  if (aroundEmission?.[1]) {
    return toBRDateTime(aroundEmission[1], aroundEmission[2]);
  }

  const genericDate = text.match(
    /(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?/,
  );
  if (genericDate?.[1]) {
    return toBRDateTime(genericDate[1], genericDate[2]);
  }

  return null;
}

function getFallbackDateAtMidnight(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  return `${dd}/${mm}/${yyyy} 00:00:00`;
}

function validateNfceSpUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("QR Code invalido: URL nao reconhecida.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("URL invalida para consulta da NFC-e.");
  }

  const host = parsed.hostname.toLowerCase();
  if (!host.endsWith(SUPPORTED_HOST_SUFFIX)) {
    throw new Error(
      "Somente URLs da NFC-e de Sao Paulo (fazenda.sp.gov.br) sao suportadas.",
    );
  }

  const hasKnownQuery = parsed.searchParams.has("p") || parsed.searchParams.has("chNFe");
  if (!hasKnownQuery) {
    throw new Error("Link da NFC-e sem parametros esperados (p/chNFe).");
  }

  return parsed.toString();
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

function extractQtyAndUnit(text: string | null | undefined): { qty: string; unit: string } {
  if (!text) return { qty: "1", unit: "UN" };

  const qtyMatch = text.match(/Qtde\.?:\s*([\d.,]+)/i);
  const unitMatch = text.match(/UN:\s*([A-Z]+)/i);

  return {
    qty: qtyMatch ? qtyMatch[1] : "1",
    unit: unitMatch ? unitMatch[1].toUpperCase() : "UN",
  };
}

function extractUnitPrice(text: string | null | undefined): string {
  const match = text?.match(/Vl\.?\s*Unit\.?:\s*([\d.,]+)/i);
  return match ? match[1] : "0,00";
}

function cleanProductName(name: string | null | undefined): string {
  if (!name) return "";

  return name
    .replace(/\(C[óo]digo:.*?\)/i, "")
    .replace(/(?<!\d)\s+(KG|G|ML|L|UN|PC|CX)\b$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ==============================
// Parser principal
// ==============================

export async function parseNFCeSP(url: string): Promise<Receipt> {
  const targetUrl = validateNfceSpUrl(url);
  let html: string | null = null;
  const attemptErrors: string[] = [];

  for (let index = 0; index < PROXIES.length; index += 1) {
    const getProxyUrl = PROXIES[index];
    try {
      const proxyUrl = getProxyUrl(targetUrl);
      const response = await fetchWithTimeout(proxyUrl, PROXY_TIMEOUT_MS);

      if (response.ok) {
        const text = await response.text();

        if (text && (text.includes("tabResult") || text.includes("txtTopo"))) {
          html = text;
          break;
        }

        attemptErrors.push(`Proxy ${index + 1}: resposta sem dados da NFC-e.`);
      } else {
        attemptErrors.push(`Proxy ${index + 1}: HTTP ${response.status}.`);
      }
    } catch (err) {
      const errorName = err instanceof Error ? err.name : "";
      const errorMessage = err instanceof Error ? err.message : "falha desconhecida";
      if (errorName === "AbortError") {
        attemptErrors.push(`Proxy ${index + 1}: timeout apos ${PROXY_TIMEOUT_MS}ms.`);
      } else {
        attemptErrors.push(`Proxy ${index + 1}: ${errorMessage}.`);
      }
      console.warn("Proxy falhou:", err);
    }
  }

  if (!html) {
    throw new Error(`Falha ao acessar Sefaz via proxies. ${attemptErrors.join(" ")}`.trim());
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    let establishment = "Estabelecimento Desconhecido";
    let date = "";
    const items: ReceiptItem[] = [];

    const companyDiv = doc.querySelector(".txtTopo");
    if (companyDiv) {
      establishment = normalizeSpaces(companyDiv.textContent || "") || establishment;
    }

    const infoCandidates = [
      ...Array.from(doc.querySelectorAll("li"), (li) => li.textContent || ""),
      ...Array.from(doc.querySelectorAll(".txtCenter, #infos, .txtChave"), (el) => el.textContent || ""),
      doc.body?.textContent || "",
    ];

    for (const candidate of infoCandidates) {
      const extractedDate = extractEmissionDate(candidate);
      if (extractedDate) {
        date = extractedDate;
        break;
      }
    }

    if (!date) {
      date = getFallbackDateAtMidnight();
      console.warn("Nao foi possivel extrair data/hora da emissao. Usando fallback com meia-noite.");
    }

    const rows = doc.querySelectorAll("table#tabResult tr");

    rows.forEach((row) => {
      const titleEl = row.querySelector(".txtTit");
      if (!titleEl) return;

      const rawName = (titleEl.textContent || "").trim();
      const fullText = row.textContent || "";

      const { qty, unit } = extractQtyAndUnit(fullText);
      const unitPrice = extractUnitPrice(fullText);

      const totalEl = row.querySelector(".valor");
      const total = totalEl ? parseNumber(totalEl.textContent) : "0,00";

      const name = cleanProductName(rawName);

      items.push({
        name,
        qty,
        unit,
        unitPrice,
        total,
      });
    });

    if (!items.length) {
      throw new Error("Nenhum item encontrado na nota.");
    }

    let accessKey: string | null = null;
    try {
      const urlObj = new URL(targetUrl);
      const p = urlObj.searchParams.get("p");
      const chNFe = urlObj.searchParams.get("chNFe");

      if (p) {
        accessKey = decodeURIComponent(p).split("|")[0];
      } else if (chNFe) {
        accessKey = chNFe;
      }
    } catch {
      // noop
    }

    return {
      id: accessKey || Date.now().toString(),
      establishment,
      date,
      items,
    };
  } catch (error) {
    console.error("Erro ao parsear NFC-e:", error);
    throw error;
  }
}
