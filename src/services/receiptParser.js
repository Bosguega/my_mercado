const PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

// ==============================
// Utils
// ==============================

function parseNumber(value, fallback = "0") {
  if (!value) return fallback;
  return value.replace(/[^\d,.-]/g, "").trim();
}

function extractQtyAndUnit(text) {
  if (!text) return { qty: "1", unit: "UN" };

  const qtyMatch = text.match(/Qtde\.?:\s*([\d.,]+)/i);
  const unitMatch = text.match(/UN:\s*([A-Z]+)/i);

  return {
    qty: qtyMatch ? qtyMatch[1] : "1",
    unit: unitMatch ? unitMatch[1].toUpperCase() : "UN",
  };
}

function extractUnitPrice(text) {
  const match = text.match(/Vl\.?\s*Unit\.?:\s*([\d.,]+)/i);
  return match ? match[1] : "0,00";
}

function cleanProductName(name) {
  if (!name) return "";

  return name
    .replace(/\(Código:.*?\)/i, "")       // remove código
    .replace(/\b(KG|G|ML|L|UN)\b$/i, "") // remove unidade no final
    .replace(/\s+/g, " ")
    .trim();
}

// ==============================
// Parser Principal
// ==============================

export async function parseNFCeSP(url) {
  let html = null;
  let lastError = null;

  // 🔁 Tentativa com múltiplos proxies
  for (const getProxyUrl of PROXIES) {
    try {
      const proxyUrl = getProxyUrl(url);
      const response = await fetch(proxyUrl);

      if (response.ok) {
        const text = await response.text();

        if (text && text.includes("tabResult")) {
          html = text;
          break;
        }
      }
    } catch (err) {
      console.warn("Proxy falhou:", err);
      lastError = err;
    }
  }

  if (!html) {
    throw new Error(
      lastError?.message ||
      "Falha ao acessar Sefaz via proxies."
    );
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    let establishment = "Estabelecimento Desconhecido";
    let date = new Date().toISOString();
    const items = [];

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
      const urlObj = new URL(url);
      const p = urlObj.searchParams.get("p");
      if (p) accessKey = p.split("|")[0];
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