import { useMemo } from "react";
import { useAllReceiptsQuery } from "./useReceiptsQuery";
import { useUiStore } from "../../stores/useUiStore";
import { applyReceiptFilters } from "../../utils/filters";
import type { Receipt } from "../../types/domain";
import type { HistoryFilters } from "../../types/ui";

interface useHistoryReceiptsReturn {
  /** Todos os receipts (sem filtros) */
  receipts: Receipt[];
  /** Items filtrados e ordenados (pronto para renderização) */
  items: Receipt[];
  /** Total de items após filtragem (antes da paginação) */
  totalCount: number;
  /** Estado de carregamento */
  isLoading: boolean;
  /** Filtros atuais */
  filters: HistoryFilters;
  /** Atualiza filtros */
  setFilters: (filters: HistoryFilters | ((prev: HistoryFilters) => HistoryFilters)) => void;
  /** Termo de busca atual */
  searchQuery: string;
  /** Atualiza termo de busca */
  setSearchQuery: (query: string) => void;
  /** Recarrega dados */
  refetch: () => void;
}

/**
 * Hook específico da HistoryTab para orquestrar dados e filtros de receipts.
 *
 * **Fluxo:**
 * 1. QUERY → useAllReceiptsQuery busca todos os receipts
 * 2. STORE → useUiStore fornece filtros (período, ordenação, busca)
 * 3. FILTER → applyReceiptFilters aplica filtros e ordenação
 * 4. UI → Retorno pronto para renderização
 *
 * **Acoplamento:**
 * - historyFilters: Filtros complexos (período, sortBy, sortOrder)
 * - historyFilter: Termo de busca por mercado
 *
 * @example
 * ```tsx
 * function HistoryTab() {
 *   const {
 *     items,
 *     totalCount,
 *     isLoading,
 *     filters,
 *     setFilters,
 *     searchQuery,
 *     setSearchQuery,
 *     refetch,
 *   } = useHistoryReceipts();
 *
 *   return <ReceiptList receipts={items} />;
 * }
 * ```
 */
export function useHistoryReceipts(): useHistoryReceiptsReturn {
  // =========================
  // 1. QUERY → Busca dados
  // =========================
  const {
    data: savedReceipts = [],
    isLoading,
    refetch
  } = useAllReceiptsQuery();

  // =========================
  // 2. STORE → Estado dos filtros
  // =========================
  const filters = useUiStore((state) => state.historyFilters);
  const setFilters = useUiStore((state) => state.setHistoryFilters);
  const searchQuery = useUiStore((state) => state.historyFilter);
  const setSearchQuery = useUiStore((state) => state.setHistoryFilter);

  // =========================
  // 3. FILTER → Aplica filtros e ordenação
  // =========================
  const filteredReceipts = useMemo(
    () => applyReceiptFilters(savedReceipts, searchQuery, filters),
    [savedReceipts, searchQuery, filters]
  );

  // =========================
  // 4. UI → Retorno estruturado
  // =========================
  return {
    receipts: savedReceipts,
    items: filteredReceipts.items,
    totalCount: filteredReceipts.totalCount,
    isLoading,
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    refetch,
  };
}
