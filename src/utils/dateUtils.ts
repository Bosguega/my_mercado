/**
 * Utilitários de Data
 *
 * Funções para manipulação e normalização de datas.
 */

/**
 * Normaliza data no formato DD/MM/YYYY para YYYY-MM-DD
 */
export function normalizeManualDate(value: string): string {
  const match = (value || "").toString().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "data";
  const [, dd, mm, yyyy] = match;
  return `${yyyy}${mm}${dd}`;
}

/**
 * Valida se string é uma data no formato DD/MM/YYYY
 */
export function isValidBRDate(value: string): boolean {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(value)) return false;

  const [dd, mm, yyyy] = value.split("/").map(Number);
  const date = new Date(yyyy, mm - 1, dd);
  return date.getFullYear() === yyyy && date.getMonth() === mm - 1 && date.getDate() === dd;
}

/**
 * Formata data para exibição
 */
export function formatDateForDisplay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Data inválida";
  return d.toLocaleDateString("pt-BR");
}

/**
 * Obtém data atual formatada como DD/MM/YYYY
 */
export function getCurrentDateBR(): string {
  return new Date().toLocaleDateString("pt-BR");
}

/**
 * Extrai ano e mês de uma data YYYY-MM-DD
 */
export function extractYearMonth(isoDate: string): { year: number; month: number } | null {
  const match = isoDate.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
  };
}
