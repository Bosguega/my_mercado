/**
 * Utilitários para tratamento de datas no app My Mercado.
 * Padroniza o uso de ISO 8601 para armazenamento e formatos brasileiros para exibição.
 */

/**
 * Converte uma string de data (vários formatos) para objeto Date.
 * @param {string|Date} dateVal 
 * @returns {Date}
 */
export function parseToDate(dateVal) {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return dateVal;

  // Formato BR: DD/MM/AAAA HH:mm:ss
  if (typeof dateVal === 'string' && dateVal.includes('/')) {
    const parts = dateVal.split(' ');
    const [day, month, year] = parts[0].split('/');
    
    const date = new Date(year, month - 1, day);
    
    if (parts[1]) {
      const [hours, minutes, seconds] = parts[1].split(':');
      date.setHours(parseInt(hours, 10) || 0);
      date.setMinutes(parseInt(minutes, 10) || 0);
      date.setSeconds(parseInt(seconds, 10) || 0);
    }
    
    return date;
  }

  // Fallback para o construtor nativo (ISO, etc)
  const date = new Date(dateVal);
  return isNaN(date.getTime()) ? new Date() : date;
}

/**
 * Formata uma data para o padrão brasileiro (DD/MM/AAAA HH:mm:ss).
 * @param {string|Date} dateVal 
 * @param {boolean} includeTime 
 * @returns {string}
 */
export function formatToBR(dateVal, includeTime = true) {
  const date = parseToDate(dateVal);
  
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
 * @returns {string}
 */
export function formatToISO(dateVal) {
  const date = parseToDate(dateVal);
  return date.toISOString();
}

/**
 * Retorna apenas a data formatada para input HTML (YYYY-MM-DD).
 * @param {string|Date} dateVal 
 * @returns {string}
 */
export function formatToInputDate(dateVal) {
  const date = parseToDate(dateVal);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
