import { normalizeKey } from "../src/utils/normalize.js";

// Mocking some functions based on src/services/productService.js
function stripVariableInfo(name, unit, qty) {
  if (!name) return "";

  // 1. Remove unidades isoladas no final (ex: "MANGA TOMMY KG" -> "MANGA TOMMY")
  let cleanName = name.replace(/(?<!\d)\s+(KG|G|ML|L|UN|PC|CX)\b$/i, "").trim();

  const qtyNum = parseFloat(String(qty || "0").replace(",", "."));

  // 2. Peso variável (hortifruti, carnes, etc)
  if (unit === "KG" && qtyNum < 5) {
    return cleanName
      .replace(/\b\d+[.,]?\d*\s?(KG|G)\b/gi, "")
      .trim();
  }

  return cleanName;
}

function cleanAIName(name) {
  if (!name) return "";
  return name
    .replace(/\s+/g, " ")
    .trim();
}

const testCases = [
  { name: "COCA-COLA 2L", unit: "UN", qty: "1" },
  { name: "CERV BRAHMA LTA 350ML", unit: "UN", qty: "1" },
  { name: "TOMATE ITALIA 0,650KG", unit: "KG", qty: "0,650" },
  { name: "LEITE INTEGRAL 1L", unit: "UN", qty: "1" },
  { name: "COCA COLA 1.5L", unit: "UN", qty: "1" },
  { name: "MANGA TOMMY KG", unit: "KG", qty: "0.800" },
  { name: "MIOLO DE ALCATRA KG", unit: "KG", qty: "1.200" }
];

console.log("=== Testing Pipeline Logic ===");
testCases.forEach(item => {
  const nameForKey = stripVariableInfo(item.name, item.unit, item.qty);
  const key = normalizeKey(nameForKey);
  const strippedForAI = stripVariableInfo(item.name, item.unit, item.qty);
  
  // Simulated AI Output (Mental Model of current prompt)
  let aiOutput = strippedForAI;
  if (item.name.includes("CERV BRAHMA")) aiOutput = "Cerveja Brahma Lata 350ml";
  if (item.name.includes("COCA COLA 1.5L")) aiOutput = "Coca-Cola 1.5L";
  if (item.name.includes("TOMATE")) aiOutput = "Tomate Italiano";

  const cleanedOutput = cleanAIName(aiOutput);

  console.log(`\nInput: "${item.name}"`);
  console.log(`  Name for Key:   "${nameForKey}"`);
  console.log(`  Normalized Key: "${key}"`);
  console.log(`  Sent to AI:     "${strippedForAI}"`);
  console.log(`  AI Output:      "${aiOutput}"`);
  console.log(`  Final (cleaned):"${cleanedOutput}"`);
  
  if (aiOutput !== cleanedOutput) {
    console.log(`  [!] WARNING: Final name was modified after AI. Lost info: "${aiOutput.replace(cleanedOutput, "").trim()}"`);
  }
});
