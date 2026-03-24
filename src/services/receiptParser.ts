const PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];
const PROXY_TIMEOUT_MS = 12000;
const SUPPORTED_HOST_SUFFIX = 'fazenda.sp.gov.br';

// ==============================
// Utils
// ==============================

function parseNumber(value: any, fallback = "0") { // TODO: type
  if (!value) return fallback;
  return value.replace(/[^\d,.-]/g, "").trim();
}

function validateNfceSpUrl(rawUrl: any) { // TODO: type
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("QR Code inválido: URL não reconhecida.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("URL inválida para consulta da NFC-e.");
  }

  const host = parsed.hostname.toLowerCase();
  if (!host.endsWith(SUPPORTED_HOST_SUFFIX)) {
    throw new Error("Somente URLs da NFC-e de São Paulo (fazenda.sp.gov.br) são suportadas.");
  }

  const hasKnownQuery = parsed.searchParams.has("p") || parsed.searchParams.has("chNFe");
  if (!hasKnownQuery) {
    throw new Error("Link da NFC-e sem parâmetros esperados (p/chNFe).");
  }

  return parsed.toString();
}

async function fetchWithTimeout(url: any, timeoutMs: any) { // TODO: type
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

function extractQtyAndUnit(text: any) { // TODO: type
  if (!text) return { qty: "1", unit: "UN" };

  const qtyMatch = text.match(/Qtde\.?:\s*([\d.,]+)/i);
  const unitMatch = text.match(/UN:\s*([A-Z]+)/i);

  return {
    qty: qtyMatch ? qtyMatch[1] : "1",
    unit: unitMatch ? unitMatch[1].toUpperCase() : "UN",
  };
}

function extractUnitPrice(text: any) { // TODO: type
  const match = text.match(/Vl\.?\s*Unit\.?:\s*([\d.,]+)/i);
  return match ? match[1] : "0,00";
}

function cleanProductName(name: any) { // TODO: type
  if (!name) return "";

  return name
    .replace(/\(Código:.*?\)/i, "")       // remove código
    .replace(/(?<!\d)\s+(KG|G|ML|L|UN|PC|CX)\b$/i, "") // remove unidade isolada no final (ex: "MANGA TOMMY KG" -> "MANGA TOMMY")
    .replace(/\s+/g, " ")
    .trim();
}

// ==============================
// Parser Principal
// ==============================

export async function parseNFCeSP(url: any) { // TODO: type
  const targetUrl = validateNfceSpUrl(url);
  let html = null;
  const attemptErrors = [];

  // 🔁 Tentativa com múltiplos proxies
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
    } catch (err: any) { // TODO: type
      if (err?.name === "AbortError") {
        attemptErrors.push(`Proxy ${index + 1}: timeout após ${PROXY_TIMEOUT_MS}ms.`);
      } else {
        attemptErrors.push(`Proxy ${index + 1}: ${err?.message || "falha desconhecida"}.`);
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
    let date = new Date().toISOString();
    const items: any[] = []; // TODO: type

    // 🏪 Empresa
    const companyDiv = doc.querySelector(".txtTopo");
    if (companyDiv) {
      establishment = companyDiv.textContent.trim();
    }

    // 📅 Data
    const lis = doc.querySelectorAll("li");
    lis.forEach((li) => {
      const text = li.textContent;

      if (text.includes("Emissão:")) {
        const match = text.match(
          /Emissão:\s*(\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2})/i
        );

        date = match
          ? match[1].trim()
          : text.replace("Emissão:", "").trim();
      }
    });

    // ==============================
    // 📦 Itens
    // ==============================

    const rows = doc.querySelectorAll("table#tabResult tr");

    rows.forEach((row) => {
      const titleEl = row.querySelector(".txtTit");
      if (!titleEl) return;

      const rawName = titleEl.textContent.trim();
      const fullText = row.textContent;

      // 🔍 Extrair dados estruturados
      const { qty, unit } = extractQtyAndUnit(fullText);
      const unitPrice = extractUnitPrice(fullText);

      const totalEl = row.querySelector(".valor");
      const total = totalEl
        ? parseNumber(totalEl.textContent)
        : "0,00";

      // 🧼 Nome limpo
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

    // 🔑 Chave da NFCe
    let accessKey = null;
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
      // Ignora erro no parse da URL
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
