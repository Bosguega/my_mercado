import { parse, format, isValid, parseISO, isDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Utilitários para tratamento de datas no app My Mercado.
 * Usa date-fns para manipulação e parsing robusto.
 * Padroniza o uso de ISO 8601 para armazenamento.
 */

/**
 * Converte uma string de data (vários formatos) para objeto Date.
 * Prioriza formatos brasileiros: DD/MM/AAAA ou DD/MM/AAAA HH:mm:ss
 */
export function parseToDate(dateVal: string | Date | null | undefined): Date | null {
  if (!dateVal) return null;
  if (isDate(dateVal)) return dateVal as Date;

  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (!trimmed) return null;

    // Se vier com "/" é o formato brasileiro DD/MM/AAAA (com ou sem hora)
    if (trimmed.includes('/')) {
      // Caso 1: DD/MM/AAAA HH:mm:ss
      if (trimmed.includes(':')) {
        const parsed = parse(trimmed, 'dd/MM/yyyy HH:mm:ss', new Date());
        if (isValid(parsed)) return parsed;
        
        // Caso 2: DD/MM/AAAA HH:mm
        const parsedShort = parse(trimmed, 'dd/MM/yyyy HH:mm', new Date());
        if (isValid(parsedShort)) return parsedShort;
      }
      
      // Caso 3: apenas DD/MM/AAAA
      const parsedOnlyDate = parse(trimmed, 'dd/MM/yyyy', new Date());
      if (isValid(parsedOnlyDate)) return parsedOnlyDate;
    }

    // Tentar como ISO (ex: do banco de dados)
    const parsedISO = parseISO(trimmed);
    if (isValid(parsedISO)) return parsedISO;

    // Fallback final: construtor nativo
    const date = new Date(trimmed);
    return isValid(date) ? date : null;
  }

  return null;
}

/**
 * Formata uma data para o padrão brasileiro (DD/MM/AAAA HH:mm:ss).
 */
export function formatToBR(
  dateVal: string | Date | null | undefined,
  includeTime = true,
): string {
  const date = parseToDate(dateVal);
  if (!date) return "";
  
  const pattern = includeTime ? 'dd/MM/yyyy HH:mm:ss' : 'dd/MM/yyyy';
  return format(date, pattern, { locale: ptBR });
}

/**
 * Formata uma data para o padrão ISO (usado no banco de dados).
 */
export function formatToISO(dateVal: string | Date | null | undefined): string | null {
  const date = parseToDate(dateVal);
  return (date && isValid(date)) ? date.toISOString() : null;
}

/**
 * Retorna apenas a data formatada para input HTML (YYYY-MM-DD).
 */
export function formatToInputDate(dateVal: string | Date | null | undefined): string {
  const date = parseToDate(dateVal);
  if (!date || !isValid(date)) return "";
  return format(date, 'yyyy-MM-dd');
}

/**
 * Retorna uma data relativa legível (ex: "hoje", "ontem", "há 2 dias").
 */
export function formatRelative(dateVal: string | Date | null | undefined): string {
  const date = parseToDate(dateVal);
  if (!date || !isValid(date)) return "";
  
  return new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(
    Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
    'day'
  );
}
