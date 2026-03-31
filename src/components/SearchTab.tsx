import { useState } from "react";
import { LineChart as LineChartIcon, ArrowLeft } from "lucide-react";
import UniversalSearchBar from "./UniversalSearchBar";
import { PeriodSelector, PeriodDatePickers } from "./PeriodSelector";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SearchSortBy } from "../types/ui";
import { useUiStore } from "../stores/useUiStore";
import { useAllReceiptsQuery } from "../hooks/queries/useReceiptsQuery";
import { useCanonicalProductsQuery } from "../hooks/queries/useCanonicalProductsQuery";
import { useSearchItems } from "../hooks/queries/useSearchItems";
import { useFilteredSearchItems } from "../hooks/queries/useFilteredSearchItems";
import { useSearchChartData } from "../hooks/queries/useSearchChartData";
import { SearchItemRow } from "./SearchItemRow";
import { Skeleton } from "./Skeleton";

// =========================
// COMPONENTE DE GRÁFICO
// =========================

interface PriceChartProps {
  chartData: Array<Record<string, string | number>>;
  groupedItems: Record<string, unknown[]>;
  onBack: () => void;
}

function PriceChart({ chartData, groupedItems, onBack }: PriceChartProps) {
  const colors = [
    "#3b82f6",
    "#10b981",
    "#f43f5e",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
  ];

  return (
    <div className="glass-card" style={{ padding: "1.25rem" }}>
      <button
        className="btn"
        onClick={onBack}
        style={{
          marginBottom: "1.5rem",
          background: "rgba(255,255,255,0.05)",
          boxShadow: "none",
          color: "#94a3b8",
          padding: "0.5rem 1rem",
          fontSize: "0.85rem",
        }}
      >
        <ArrowLeft size={16} /> Voltar
      </button>
      <h3
        style={{ marginBottom: "1.5rem", color: "#fff", fontSize: "1.2rem" }}
      >
        Tendência de Preços
      </h3>

      <div style={{ width: "100%", height: 300, marginTop: "1rem" }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={chartData}>
            <CartesianGrid
              stroke="#1e293b"
              strokeDasharray="5 5"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="#475569"
              fontSize={10}
              tickMargin={10}
            />
            <YAxis
              stroke="#475569"
              fontSize={10}
              tickFormatter={(value) => `R$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.9)",
                border: "1px solid var(--card-border)",
                borderRadius: "12px",
                fontSize: "0.8rem",
              }}
              itemStyle={{ padding: "2px 0" }}
              cursor={{ stroke: "#334155" }}
            />
            {Object.keys(groupedItems).map((itemName, idx) => (
              <Line
                key={itemName}
                type="monotone"
                name={itemName}
                dataKey={itemName}
                stroke={colors[idx % colors.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: colors[idx % colors.length] }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

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
      <PriceChart
        chartData={chartData}
        groupedItems={groupedItems}
        onBack={() => setShowChart(false)}
      />
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
            <div key={i} className="item-row" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", padding: "1rem", marginBottom: "0.5rem", borderRadius: "1rem" }}>
              <div style={{ flex: 1 }}>
                <Skeleton width="60%" height="18px" style={{ marginBottom: "8px" }} />
                <Skeleton width="40%" height="14px" />
              </div>
              <div style={{ textAlign: "right" }}>
                <Skeleton width="80px" height="20px" style={{ marginBottom: "4px" }} />
                <Skeleton width="40px" height="12px" style={{ marginLeft: "auto" }} />
              </div>
            </div>
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
