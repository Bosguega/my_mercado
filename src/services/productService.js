// ==============================
// IMPORTS (ajuste conforme seu projeto)
// ==============================

import { getDictionary, updateDictionary } from "./dbMethods";
import { callAI } from "../utils/aiClient";

// ==============================
// 🔤 NORMALIZAÇÃO LEVE
// ==============================

export function normalizeKey(name) {
  if (!name) return "";

  return name
    .toUpperCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ==============================
// 🧼 REMOVER PESO VARIÁVEL
// ==============================

function stripVariableInfo(name, unit, qty) {
  if (!name) return "";

  const qtyNum = parseFloat(String(qty || "0").replace(",", "."));

  // Peso variável (hortifruti, carnes, etc)
  if (unit === "KG" && qtyNum < 5) {
    return name
      .replace(/\b\d+[.,]?\d*\s?(KG|G)\b/gi, "")
      .trim();
  }

  return name;
}

// ==============================
// 🧠 LIMPEZA PÓS IA
// ==============================

function cleanAIName(name) {
  if (!name) return "";

  return name
    .replace(/\b\d+[.,]\d+\s?(KG|G|L|ML)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ==============================
// 🔢 CONVERSÃO NUMÉRICA
// ==============================

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;

  // Já é número
  if (typeof value === "number") return isNaN(value) ? fallback : value;

  const num = parseFloat(String(value).replace(",", "."));
  return isNaN(num) ? fallback : num;
}

// ==============================
// 🚀 PIPELINE PRINCIPAL
// ==============================

export async function processItemsPipeline(rawItems = []) {
  if (!rawItems.length) return [];

  // ==============================
  // 1. NORMALIZAÇÃO INICIAL
  // ==============================

  const itemsWithKey = rawItems.map((item) => ({
    ...item,
    normalized_key: normalizeKey(item.name),
  }));

  // ==============================
  // 2. BUSCAR DICIONÁRIO
  // ==============================

  const keys = [...new Set(itemsWithKey.map((i) => i.normalized_key))];
  const dictionary = await getDictionary(keys);

  // ==============================
  // 3. SEPARAR CONHECIDOS / DESCONHECIDOS
  // ==============================

  const knownItems = [];
  const unknownMap = new Map();

  itemsWithKey.forEach((item) => {
    const dictEntry = dictionary[item.normalized_key];

    if (dictEntry) {
      knownItems.push({
        ...item,
        normalized_name: dictEntry.normalized_name,
        category: dictEntry.category,
      });
    } else {
      if (!unknownMap.has(item.normalized_key)) {
        const cleanName = stripVariableInfo(
          item.name,
          item.unit,
          item.qty
        );

        unknownMap.set(item.normalized_key, cleanName);
      }
    }
  });

  // ==============================
  // 4. CHAMAR IA (EM LOTES)
  // ==============================

  const unknownEntries = Array.from(unknownMap.entries()).map(
    ([key, raw]) => ({ key, raw })
  );

  let aiResults = [];

  for (let i = 0; i < unknownEntries.length; i += 10) {
    const chunk = unknownEntries.slice(i, i + 10);

    try {
      const response = await callAI(chunk);

      const cleaned = response.map((r) => ({
        key: r.key,
        normalized_name: cleanAIName(r.normalized_name),
        category: r.category || "Outros",
      }));

      aiResults = [...aiResults, ...cleaned];
    } catch (err) {
      console.warn("Erro na IA, usando fallback:", err);

      const fallback = chunk.map((item) => ({
        key: item.key,
        normalized_name: item.raw,
        category: "Outros",
      }));

      aiResults = [...aiResults, ...fallback];
    }
  }

  // ==============================
  // 5. ATUALIZAR DICIONÁRIO
  // ==============================

  if (aiResults.length) {
    await updateDictionary(aiResults);
  }

  // ==============================
  // 6. MAPA FINAL (IA + DICIONÁRIO)
  // ==============================

  const aiMap = aiResults.reduce((acc, r) => {
    acc[r.key] = r;
    return acc;
  }, {});

  // ==============================
  // 7. MONTAGEM FINAL
  // ==============================

  const finalItems = itemsWithKey.map((item) => {
    const dictEntry =
      dictionary[item.normalized_key] ||
      aiMap[item.normalized_key];

    const quantity = toNumber(item.qty, 1);
    const unitPrice = toNumber(item.unitPrice, 0);
    const totalValue = quantity * unitPrice;

    // Formata strings BRL para a UI
    const fmtQty = quantity.toString().replace(".", ",");
    const fmtPrice = unitPrice.toFixed(2).replace(".", ",");
    const fmtTotal = totalValue.toFixed(2).replace(".", ",");

    return {
      name: item.name,
      normalized_key: item.normalized_key,
      normalized_name: dictEntry?.normalized_name || item.name,
      category: dictEntry?.category || "Outros",

      // Campos numéricos (para persistência no DB)
      quantity,
      unit: item.unit || "UN",
      price: unitPrice,

      // Campos string BRL (para exibição na UI)
      qty: fmtQty,
      unitPrice: fmtPrice,
      total: fmtTotal,
    };
  });

  return finalItems;
}