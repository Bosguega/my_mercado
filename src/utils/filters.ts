/**
 * Utilitários de Filtro e Ordenação
 *
 * Funções puras para filtrar e ordenar dados.
 */

import { parseToDate } from "./date";
import { parseBRL } from "./currency";
import type { Receipt } from "../types/domain";
import type { HistoryFilters, SearchFilters } from "../types/ui";
import { startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";

/**
 * Filtra receipts por termo de busca
 */
export function filterBySearch(receipts: Receipt[], search: string): Receipt[] {
  if (!search.trim()) return receipts;
  const searchLower = search.toLowerCase();
  return receipts.filter((receipt) =>
    receipt.establishment?.toLowerCase().includes(searchLower)
  );
}

/**
 * Filtra receipts por período
 */
export function filterByPeriod(
  receipts: Receipt[],
  period: HistoryFilters["period"],
  startDate?: string,
  endDate?: string
): Receipt[] {
  if (period === "all") return receipts;

  const now = new Date();
  const thisMonth = { start: startOfMonth(now), end: endOfMonth(now) };
  // Últimos 3 meses completos (mês atual + 2 meses anteriores)
  const last3MonthsStart = startOfMonth(subMonths(now, 2));

  return receipts.filter((receipt) => {
    const receiptDate = parseToDate(receipt.date);
    if (!receiptDate) return false;

    if (period === "this-month") {
      return isWithinInterval(receiptDate, thisMonth);
    }
    if (period === "last-3-months") {
      return receiptDate >= last3MonthsStart;
    }
    if (period === "custom" && startDate && endDate) {
      const start = parseToDate(startDate);
      const end = parseToDate(endDate);

      // Valida datas e garante que start <= end
      if (!start || !end || start > end) return false;

      // Ajusta end para incluir o dia final completo
      const intervalEnd = new Date(end);
      intervalEnd.setHours(23, 59, 59, 999);

      return isWithinInterval(receiptDate, { start, end: intervalEnd });
    }
    return false;
  });
}

/**
 * Filtra items por período (baseado em purchasedAt)
 */
export function filterItemsByPeriod<T extends { purchasedAt?: string }>(
  items: T[],
  period: SearchFilters["period"],
  startDate?: string,
  endDate?: string
): T[] {
  if (period === "all") return items;

  const now = new Date();
  const thisMonth = { start: startOfMonth(now), end: endOfMonth(now) };
  // Últimos 3 meses completos (mês atual + 2 meses anteriores)
  const last3MonthsStart = startOfMonth(subMonths(now, 2));

  return items.filter((item) => {
    if (!item.purchasedAt) return false;

    const itemDate = parseToDate(item.purchasedAt);
    if (!itemDate) return false;

    if (period === "this-month") {
      return isWithinInterval(itemDate, thisMonth);
    }
    if (period === "last-3-months") {
      return itemDate >= last3MonthsStart;
    }
    if (period === "custom" && startDate && endDate) {
      const start = parseToDate(startDate);
      const end = parseToDate(endDate);

      // Valida datas e garante que start <= end
      if (!start || !end || start > end) return false;

      // Ajusta end para incluir o dia final completo
      const intervalEnd = new Date(end);
      intervalEnd.setHours(23, 59, 59, 999);

      return isWithinInterval(itemDate, { start, end: intervalEnd });
    }
    return false;
  });
}

/**
 * Ordena receipts por critério
 */
export function sortReceipts(
  receipts: Receipt[],
  sortBy: HistoryFilters["sortBy"],
  sortOrder: HistoryFilters["sortOrder"]
): Receipt[] {
  return [...receipts].sort((a, b) => {
    if (sortBy === "date") {
      const timeA = parseToDate(a.date)?.getTime() || -Infinity;
      const timeB = parseToDate(b.date)?.getTime() || -Infinity;
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    }
    if (sortBy === "value") {
      const totalA = a.items.reduce(
        (acc, item) => acc + parseBRL(item.price || "0") * parseBRL(String(item.quantity || item.qty || 1)),
        0
      );
      const totalB = b.items.reduce(
        (acc, item) => acc + parseBRL(item.price || "0") * parseBRL(String(item.quantity || item.qty || 1)),
        0
      );
      return sortOrder === "asc" ? totalA - totalB : totalB - totalA;
    }
    if (sortBy === "store") {
      const storeA = (a.establishment || "").toLowerCase();
      const storeB = (b.establishment || "").toLowerCase();
      return sortOrder === "asc" ? storeA.localeCompare(storeB) : storeB.localeCompare(storeA);
    }
    return 0;
  });
}

/**
 * Aplica todos os filtros em receipts
 */
export function applyReceiptFilters(
  receipts: Receipt[],
  search: string,
  filters: HistoryFilters
): { items: Receipt[]; totalCount: number } {
  let filtered = filterBySearch(receipts, search);
  filtered = filterByPeriod(filtered, filters.period, filters.startDate, filters.endDate);
  filtered = sortReceipts(filtered, filters.sortBy, filters.sortOrder);
  return {
    items: filtered.slice(0, 50),
    totalCount: filtered.length,
  };
}

/**
 * Filtra items por termo de busca em múltiplos campos
 */
export function filterItemsBySearch<T extends Record<string, unknown>>(
  items: T[],
  search: string,
  fields: (keyof T)[]
): T[] {
  if (!search.trim()) return items;
  const searchLower = search.toLowerCase();
  return items.filter((item) =>
    fields.some((field) => {
      const value = item[field];
      if (typeof value === "string") {
        return value.toLowerCase().includes(searchLower);
      }
      return false;
    })
  );
}

/**
 * Ordena items por critério
 */
export function sortItems<T extends Record<string, unknown>>(
  items: T[],
  sortBy: string,
  sortDirection: "asc" | "desc",
  customSorters?: Record<string, (a: T, b: T) => number>
): T[] {
  return [...items].sort((a, b) => {
    if (customSorters?.[sortBy]) {
      const result = customSorters[sortBy](a, b);
      return sortDirection === "asc" ? result : -result;
    }

    const aValue = a[sortBy];
    const bValue = b[sortBy];

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });
}
