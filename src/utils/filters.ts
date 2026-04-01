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

// ==============================
// Funções Genéricas
// ==============================

/**
 * Filtra items por termo de busca em múltiplos campos
 */
export function filterBySearch<T extends object>(
  items: T[],
  query: string,
  fields: (keyof T)[],
): T[] {
  if (!query) return items;

  const q = query.toLowerCase();

  return items.filter((item) =>
    fields.some((field) => {
      const value = (item as Record<string, unknown>)[field as string];
      return String(value ?? "").toLowerCase().includes(q);
    })
  );
}

/**
 * Ordena items por critério com suporte a custom sorters
 */
export function sortItems<T extends object>(
  items: T[],
  sortBy: string,
  direction: "asc" | "desc",
  customSorters: Record<string, (a: T, b: T) => number> = {},
): T[] {
  const sorted = [...items];

  if (customSorters[sortBy]) {
    sorted.sort((a, b) =>
      direction === "asc"
        ? customSorters[sortBy](a, b)
        : customSorters[sortBy](b, a)
    );
    return sorted;
  }

  return sorted;
}

// ==============================
// Funções Específicas para Receipts
// ==============================

/**
 * Filtra receipts por termo de busca (estabelecimento)
 */
export function filterReceiptsBySearch(receipts: Receipt[], search: string): Receipt[] {
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
        (acc, item) => acc + parseBRL(item.price || "0") * (item.quantity || 1),
        0
      );
      const totalB = b.items.reduce(
        (acc, item) => acc + parseBRL(item.price || "0") * (item.quantity || 1),
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
  let filtered = filterReceiptsBySearch(receipts, search);
  filtered = filterByPeriod(filtered, filters.period, filters.startDate, filters.endDate);
  filtered = sortReceipts(filtered, filters.sortBy, filters.sortOrder);
  return {
    items: filtered,
    totalCount: filtered.length,
  };
}
