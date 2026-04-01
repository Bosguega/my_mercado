import { useState, lazy, Suspense } from "react";
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

// Lazy loading do gráfico (recharts ~200KB)
const PriceChart = lazy(() => import("./PriceChart"));

// Componente de loading para Suspense
const ChartSkeleton = () => (
  <div className="glass-card" style={{ padding: "1.25rem", textAlign: "center" }}>
    <div className="skeleton-line" style={{ width: "100px", height: "36px", margin: "0 auto 1.5rem" }} />
    <div className="skeleton-line" style={{ width: "200px", height: "24px", margin: "0 auto 1.5rem" }} />
    <div className="skeleton-line" style={{ width: "100%", height: "300px" }} />
  </div>
);

// =========================
// COMPONENTE PRINCIPAL
// =========================

function SearchTab() {
  // =========================
  // 1. DADOS (React Query)
  // =========================
  const { data: savedReceipts = [], isLoading: loading } = useAllReceiptsQuery();
  const { data: canonicalProducts = [] } = useCanonicalProductsQuery();

  // =========================
  // 2. ESTADO DE UI (Zustand)
  // =========================
  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);
  const sortOrder = useUiStore((state) => state.sortOrder);
  const setSortOrder = useUiStore((state) => state.setSortOrder);
  const sortDirection = useUiStore((state) => state.searchSortDirection);
  const setSortDirection = useUiStore((state) => state.setSearchSortDirection);
  const searchFilters = useUiStore((state) => state.searchFilters);
  const setSearchFilters = useUiStore((state) => state.setSearchFilters);

  // Estado local
  const [showChart, setShowChart] = useState(false);
  const showSkeleton = loading && savedReceipts.length === 0;

  // =========================
  // 3. HOOKS DE DOMÍNIO
  // =========================
  
  // Transformação: receipts → items
  const { items: allItems } = useSearchItems(savedReceipts, canonicalProducts);

  // Filtros + ordenação
  const { items: filteredItems, totalCount } = useFilteredSearchItems({
    items: allItems,
    searchQuery,
    sortOrder,
    sortDirection,
    searchFilters,
  });

  // Dados do gráfico
  const { groupedItems, chartData } = useSearchChartData(
    filteredItems,
    canonicalProducts,
    showChart
  );

  // =========================
  // 4. RENDER: GRÁFICO
  // =========================
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

  // =========================
  // 5. RENDER: LISTA
  // =========================
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
          { value: "price", label: "Preço" }
        ]}
        extraActions={
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            {/* Seletor de Período (componente reutilizável) */}
            <PeriodSelector
              filters={searchFilters}
              onChange={setSearchFilters}
            />

            {/* Contador e Botão de Gráfico */}
            {searchQuery && filteredItems.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {totalCount > 100 ? "Exibindo 100+" : `${totalCount} itens`}
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
                    cursor: "pointer"
                  }}
                >
                  <LineChartIcon size={16} /> Gráfico
                </button>
              </div>
            )}
          </div>
        }
      />

      {/* Date Pickers para Período Personalizado (componente reutilizável) */}
      <PeriodDatePickers
        filters={searchFilters}
        onChange={setSearchFilters}
      />

      {/* Lista de Items */}
      <div className="items-list">
        {showSkeleton ? (
          [...Array(6)].map((_, i) => (
            <SearchItemSkeleton key={i} />
          ))
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1rem",
              color: "#64748b",
            }}
          >
            <p>Nenhum item encontrado.</p>
          </div>
        ) : (
          <>
            {filteredItems.map((item, idx) => (
              <SearchItemRow
                key={`${item.normalized_name || item.name}-${item.purchasedAt}-${idx}`}
                item={item}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default SearchTab;
