/**
 * Utilitários para tratamento de datas no app My Mercado.
 * Padroniza o uso de ISO 8601 para armazenamento e formatos brasileiros para exibição.
 */

/**
 * Converte uma string de data (vários formatos) para objeto Date.
 * @param {string|Date} dateVal 
 * @returns {Date|null}
 */
export function parseToDate(dateVal: string | Date | null | undefined): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;

  // Formato BR: DD/MM/AAAA HH:mm:ss
  if (typeof dateVal === 'string' && dateVal.includes('/')) {
    const parts = dateVal.trim().split(' ');
    const [day, month, year] = parts[0].split('/');
    const dayNum = Number(day);
    const monthNum = Number(month);
    const yearNum = Number(year);
    
    // Se não for um formato de data válido, retorna null em vez de "today"
    if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return null;

    const date = new Date(yearNum, monthNum - 1, dayNum);
    
    if (parts[1]) {
      const timeParts = parts[1].split(':');
      date.setHours(parseInt(timeParts[0], 10) || 0);
      date.setMinutes(parseInt(timeParts[1], 10) || 0);
      date.setSeconds(parseInt(timeParts[2], 10) || 0);
    }
    
    return isNaN(date.getTime()) ? null : date;
  }

  // Fallback para o construtor nativo (ISO, etc)
  const date = new Date(dateVal);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Formata uma data para o padrão brasileiro (DD/MM/AAAA HH:mm:ss).
 * @param {string|Date} dateVal 
 * @param {boolean} includeTime 
 * @returns {string}
 */
export function formatToBR(
  dateVal: string | Date | null | undefined,
  includeTime = true,
): string {
  const date = parseToDate(dateVal);
  if (!date) return "";
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  let formatted = `${day}/${month}/${year}`;
  
  if (includeTime) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    formatted += ` ${hours}:${minutes}:${seconds}`;
  }
  
  return formatted;
}

/**
 * Formata uma data para o padrão ISO (usado no banco de dados).
 * @param {string|Date} dateVal 
 * @returns {string|null}
 */
export function formatToISO(dateVal: string | Date | null | undefined): string | null {
  const date = parseToDate(dateVal);
  return date ? date.toISOString() : null;
}

/**
 * Retorna apenas a data formatada para input HTML (YYYY-MM-DD).
 * @param {string|Date} dateVal 
 * @returns {string}
 */
export function formatToInputDate(dateVal: string | Date | null | undefined): string {
  const date = parseToDate(dateVal);
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
