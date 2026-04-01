import { useMemo } from "react";
import { parseBRL } from "../../utils/currency";
import { parseToDate } from "../../utils/date";
import { filterBySearch, sortItems } from "../../utils/filters";
import { filterItemsByPeriod } from "../../utils/filters";
import type { PurchasedItem, SearchSortBy, SortDirection } from "../../types/ui";
import type { SearchFilters } from "../../types/ui";

interface UseFilteredSearchItemsReturn {
  /** Items filtrados e ordenados (pronto para renderização) */
  items: PurchasedItem[];
  /** Total de items após filtragem (antes da paginação) */
  totalCount: number;
}

interface UseFilteredSearchItemsParams {
  /** Todos os items (sem filtros) */
  items: (PurchasedItem & { canonical_name?: string })[];
  /** Termo de busca */
  searchQuery: string;
  /** Critério de ordenação */
  sortOrder: SearchSortBy;
  /** Direção da ordenação */
  sortDirection: SortDirection;
  /** Filtros de período */
  searchFilters: SearchFilters;
}

/**
 * Hook que aplica filtros e ordenação em items de busca.
 * 
 * Fluxo:
 * 1. Filtra por período (filterItemsByPeriod)
 * 2. Filtra por busca (filterBySearch)
 * 3. Ordena (sortItems com customSorters)
 * 4. Paginação (slice)
 * 
 * @param params - Parâmetros de filtragem
 * 
 * @example
 * ```tsx
 * const { items: filteredItems, totalCount } = useFilteredSearchItems({
 *   items: allItems,
 *   searchQuery,
 *   sortOrder,
 *   sortDirection,
 *   searchFilters,
 * });
 * ```
 */
export function useFilteredSearchItems({
  items,
  searchQuery,
  sortOrder,
  sortDirection,
  searchFilters,
}: UseFilteredSearchItemsParams): UseFilteredSearchItemsReturn {
  return useMemo(() => {
    // 1. Filtra por período primeiro
    let baseItems = filterItemsByPeriod(
      items,
      searchFilters.period,
      searchFilters.startDate,
      searchFilters.endDate
    );

    // 2. Filtra por busca
    baseItems = searchQuery.trim() === ""
      ? baseItems.slice(0, 50)
      : filterBySearch(baseItems, searchQuery, ["name", "normalized_name", "category", "canonical_name"]);

    // 3. Custom sorters
    const customSorters: Record<string, (a: PurchasedItem, b: PurchasedItem) => number> = {
      price: (a, b) => parseBRL(a.price) - parseBRL(b.price),
      recent: (a, b) => {
        const dateA = parseToDate(a.purchasedAt || "");
        const dateB = parseToDate(b.purchasedAt || "");
        const timeA = dateA ? dateA.getTime() : 0;
        const timeB = dateB ? dateB.getTime() : 0;
        return timeA - timeB;
      },
    };

    // 4. Ordena
    const sorted = sortItems(baseItems, sortOrder, sortDirection, customSorters);

    // 5. Paginação e retorno
    return {
      items: sorted.slice(0, 100),
      totalCount: sorted.length,
    };
  }, [items, searchQuery, sortOrder, sortDirection, searchFilters]);
}
