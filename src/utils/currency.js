/**
 * Parses a Brazilian currency string to a number.
 * Handles formats like "1.234,56" → 1234.56 and "1,56" → 1.56
 * @param {string|number} value
 * @returns {number}
 */
export function parseBRL(value) {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace(/[^\d.,]/g, '');
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
export function formatBRL(value) {
  return parseBRL(value).toFixed(2).replace('.', ',');
}
