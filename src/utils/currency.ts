/**
 * Parses a Brazilian currency string to a number.
 * Handles formats like "1.234,56" → 1234.56 and "1,56" → 1.56
 * @param {string|number} value
 * @returns {number}
 */
export function parseBRL(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  
  // Se já for um número, não mexe
  if (typeof value === 'number') return value;
  
  const cleaned = String(value).replace(/[^\d.,]/g, '');

  // Se não tem vírgula, e tem ponto, provavelmete é o formato decimal americano ("12.34")
  if (!cleaned.includes(',') && cleaned.includes('.')) {
    const num = parseFloat(cleaned);
    return Number.isNaN(num) ? 0 : num;
  }

  // Remove thousand separators (dots) then replace decimal comma with dot
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return Number.isNaN(num) ? 0 : num;
}

/**
 * Formats a number (or BRL string) to a Brazilian currency string.
 * e.g. 1234.56 → "1234,56"
 * @param {string|number} value
 * @returns {string}
 */
export function formatBRL(value: string | number | null | undefined): string {
  return parseBRL(value).toFixed(2).replace('.', ',');
}
