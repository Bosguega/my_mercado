import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { LineChart as LineChartIcon } from "lucide-react";
import UniversalSearchBar from "./UniversalSearchBar";
import { PeriodSelector, PeriodDatePickers } from "./PeriodSelector";
import type { SearchSortBy } from "../types/ui";
import { useUiStore } from "../stores/useUiStore";
import { useAllReceiptsQuery } from "../hooks/queries/useReceiptsQuery";
import { useCanonicalProductsQuery } from "../hooks/queries/useCanonicalProductsQuery";
import { useSearchItems } from "../hooks/queries/useSearchItems";
import { useFilteredSearchItems } from "../hooks/queries/useFilteredSearchItems";
import { useSearchChartData } from "../hooks/queries/useSearchChartData";
import { SearchItemRow } from "./SearchItemRow";
import { SearchItemSkeleton } from "./SearchItemSkeleton";

const PriceChart = lazy(() => import("./PriceChart"));
const PAGE_SIZE = 100;

const ChartSkeleton = () => (
  <div className="glass-card" style={{ padding: "1.25rem", textAlign: "center" }}>
    <div
      className="skeleton-line"
      style={{ width: "100px", height: "36px", margin: "0 auto 1.5rem" }}
    />
    <div
      className="skeleton-line"
      style={{ width: "200px", height: "24px", margin: "0 auto 1.5rem" }}
    />
    <div className="skeleton-line" style={{ width: "100%", height: "300px" }} />
  </div>
);

function SearchTab() {
  const { data: savedReceipts = [], isLoading: loading } = useAllReceiptsQuery();
  const { data: canonicalProducts = [] } = useCanonicalProductsQuery();

  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);
  const sortOrder = useUiStore((state) => state.sortOrder);
  const setSortOrder = useUiStore((state) => state.setSortOrder);
  const sortDirection = useUiStore((state) => state.searchSortDirection);
  const setSortDirection = useUiStore((state) => state.setSearchSortDirection);
  const searchFilters = useUiStore((state) => state.searchFilters);
  const setSearchFilters = useUiStore((state) => state.setSearchFilters);

  const [showChart, setShowChart] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const showSkeleton = loading && savedReceipts.length === 0;

  const { items: allItems } = useSearchItems(savedReceipts, canonicalProducts);
  const { items: filteredItems, totalCount } = useFilteredSearchItems({
    items: allItems,
    searchQuery,
    sortOrder,
    sortDirection,
    searchFilters,
  });

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, sortOrder, sortDirection, searchFilters]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount],
  );
  const hasMore = visibleItems.length < totalCount;

  const { groupedItems, chartData } = useSearchChartData(
    filteredItems,
    canonicalProducts,
    showChart,
  );

  if (showChart) {
    return (
      <Suspense fallback={<ChartSkeleton />}>
        <PriceChart
          chartData={chartData}
          groupedItems={groupedItems}
          onBack={() => setShowChart(false)}
        />
      </Suspense>
    );
  }

  return (
    <div>
      <UniversalSearchBar
        placeholder="Pesquisar por nome ou categoria..."
        value={searchQuery}
        onChange={setSearchQuery}
        sortValue={sortOrder}
        onSortChange={(value) => setSortOrder(value as SearchSortBy)}
        sortOrder={sortDirection}
        onSortOrderChange={setSortDirection}
        sortOptions={[
          { value: "recent", label: "Recentes" },
          { value: "price", label: "Preço" },
        ]}
        extraActions={
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <PeriodSelector filters={searchFilters} onChange={setSearchFilters} />

            {searchQuery && filteredItems.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Exibindo {visibleItems.length} de {totalCount} itens
                </span>
                <button
                  onClick={() => setShowChart(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--success)",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                  }}
                >
                  <LineChartIcon size={16} /> Gráfico
                </button>
              </div>
            )}
          </div>
        }
      />

      <PeriodDatePickers filters={searchFilters} onChange={setSearchFilters} />

      <div className="items-list">
        {showSkeleton ? (
          [...Array(6)].map((_, i) => <SearchItemSkeleton key={i} />)
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
            <p>Nenhum item encontrado.</p>
          </div>
        ) : (
          <>
            {visibleItems.map((item, idx) => (
              <SearchItemRow
                key={`${item.normalized_name || item.name}-${item.purchasedAt}-${idx}`}
                item={item}
              />
            ))}
            {hasMore && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: "0.5rem" }}>
                <button className="btn" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
                  Carregar mais
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SearchTab;
