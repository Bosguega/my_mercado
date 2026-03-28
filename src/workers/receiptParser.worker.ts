// Web Worker for NFC-e HTML parsing.

interface ParseMessage {
  type: "parse";
  html: string;
  url: string;
}

interface ParseResult {
  type: "result";
  success: boolean;
  receipt?: unknown;
  error?: string;
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

function parseNFCeHTML(html: string, url: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  let establishment = "Estabelecimento Desconhecido";
  let date = "";
  const items: Array<{
    name: string;
    qty: string;
    unit: string;
    unitPrice: string;
    total: string;
  }> = [];

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
  }

  const rows = doc.querySelectorAll("table#tabResult tr");
  rows.forEach((row) => {
    const titleEl = row.querySelector(".txtTit");
    if (!titleEl) return;

    const rawName = (titleEl.textContent || "").trim();
    const fullText = row.textContent || "";

    const qtyMatch = fullText.match(/Qtde\.?:\s*([\d.,]+)/i);
    const unitMatch = fullText.match(/UN:\s*([A-Z]+)/i);
    const qty = qtyMatch ? qtyMatch[1] : "1";
    const unit = unitMatch ? unitMatch[1].toUpperCase() : "UN";

    const priceMatch = fullText.match(/Vl\.?\s*Unit\.?:\s*([\d.,]+)/i);
    const unitPrice = priceMatch ? priceMatch[1] : "0,00";

    const totalEl = row.querySelector(".valor");
    const total = totalEl
      ? (totalEl.textContent || "0,00").replace(/[^\d,.-]/g, "").trim()
      : "0,00";

    const name = rawName
      .replace(/\(C[óo]digo:.*?\)/i, "")
      .replace(/(?<!\d)\s+(KG|G|ML|L|UN|PC|CX)\b$/i, "")
      .replace(/\s+/g, " ")
      .trim();

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
    const urlObj = new URL(url);
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
}

self.onmessage = async (e: MessageEvent<ParseMessage>) => {
  if (e.data.type === "parse") {
    try {
      const receipt = parseNFCeHTML(e.data.html, e.data.url);

      const result: ParseResult = {
        type: "result",
        success: true,
        receipt,
      };

      self.postMessage(result);
    } catch (error) {
      const result: ParseResult = {
        type: "result",
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };

      self.postMessage(result);
    }
  }
};
