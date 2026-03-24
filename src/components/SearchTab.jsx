import { useState, useMemo } from "react";
import { LineChart as LineChartIcon, ArrowLeft } from "lucide-react";
import UniversalSearchBar from "./UniversalSearchBar";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import PropTypes from "prop-types";
import { parseBRL } from "../utils/currency";
import { parseToDate } from "../utils/date";

// Skeleton para itens da pesquisa
const SkeletonSearch = () => (
  <div
    className="item-row"
    style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.05)",
    }}
  >
    <div style={{ flex: 1 }}>
      <div
        className="skeleton-line"
        style={{ width: "60%", height: "18px", marginBottom: "8px" }}
      />
      <div className="skeleton-line" style={{ width: "40%", height: "14px" }} />
    </div>
    <div style={{ textAlign: "right" }}>
      <div
        className="skeleton-line"
        style={{ width: "80px", height: "20px", marginBottom: "4px" }}
      />
      <div
        className="skeleton-line"
        style={{ width: "40px", height: "12px", marginLeft: "auto" }}
      />
    </div>
  </div>
);

function SearchTab({
  savedReceipts,
  searchQuery,
  setSearchQuery,
  sortOrder,
  setSortOrder,
  sortDirection,
  setSortDirection,
  loading,
}) {
  const [showChart, setShowChart] = useState(false);
  const showSkeleton = loading && savedReceipts.length === 0;

  // Memoize flattening of all items
  const allPurchasedItems = useMemo(() => {
    const items = [];
    savedReceipts.forEach((receipt) => {
      if (receipt && Array.isArray(receipt.items)) {
        receipt.items.forEach((item) => {
          items.push({
            ...item,
            purchasedAt: receipt.date,
            store: receipt.establishment,
          });
        });
      }
    });
    return items;
  }, [savedReceipts]);

  // Memoize filtered and sorted items
  const { filteredItems, totalCount } = useMemo(() => {
    const base =
      searchQuery.trim() === ""
        ? allPurchasedItems.slice(0, 50) 
        : allPurchasedItems.filter((i) =>
            i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (i.normalized_name && i.normalized_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (i.category && i.category.toLowerCase().includes(searchQuery.toLowerCase()))
          );

    let result = [...base];

    if (sortOrder === "price") {
      result.sort((a, b) => {
        const priceA = parseBRL(a.price);
        const priceB = parseBRL(b.price);
        return sortDirection === "asc" ? priceA - priceB : priceB - priceA;
      });
    } else if (sortOrder === "recent" && sortDirection === "asc") {
       result.reverse();
    }
    
    return {
      filteredItems: result.slice(0, 100),
      totalCount: result.length
    };
  }, [allPurchasedItems, searchQuery, sortOrder, sortDirection]);

  // Group items by normalized name for the chart - memoized
  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, curr) => {
      const key = curr.normalized_name || curr.name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(curr);
      return acc;
    }, {});
  }, [filteredItems]);

  // Memoize chart data calculation
  const chartData = useMemo(() => {
    if (!showChart) return [];
    
    const allDates = new Set();
    Object.keys(groupedItems).forEach((key) => {
      groupedItems[key].forEach((historyItem) => {
        if (historyItem.purchasedAt) {
          allDates.add(historyItem.purchasedAt.substring(0, 10));
        }
      });
    });

    const sortedDates = Array.from(allDates).sort((a, b) => {
      const getTime = (dateStr) => parseToDate(dateStr).getTime();
      return getTime(a) - getTime(b);
    });

    return sortedDates.map((dateStr) => {
      const dataPoint = { date: dateStr };
      Object.keys(groupedItems).forEach((itemName) => {
        const match = groupedItems[itemName].find(
          (h) => h.purchasedAt && h.purchasedAt.startsWith(dateStr),
        );
        if (match) {
          dataPoint[itemName] = parseBRL(match.price || match.unitPrice);
        }
      });
      return dataPoint;
    });
  }, [showChart, groupedItems]);

  if (showChart) {
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
          onClick={() => setShowChart(false)}
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

  return (
    <div>
      <UniversalSearchBar
        placeholder="Pesquisar por nome ou categoria..."
        value={searchQuery}
        onChange={setSearchQuery}
        sortValue={sortOrder}
        onSortChange={setSortOrder}
        sortOrder={sortDirection}
        onSortOrderChange={setSortDirection}
        sortOptions={[
          { value: "recent", label: "🕒 Recentes" },
          { value: "price", label: "💰 Preço" }
        ]}
        extraActions={
          searchQuery && filteredItems.length > 0 && (
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
          )
        }
      />

      <div className="items-list">
        {showSkeleton ? (
          [...Array(6)].map((_, i) => <SkeletonSearch key={i} />)
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
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, idx) => (
              <motion.div
                key={`${item.normalized_name || item.name}-${item.purchasedAt}-${idx}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ 
                  duration: 0.2,
                  layout: { type: "spring", stiffness: 300, damping: 30 }
                }}
                className="item-row"
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div className="item-name">{item.normalized_name || item.name}</div>
                    {item.category && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          background: "rgba(59, 130, 246, 0.1)",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          color: "var(--primary)",
                        }}
                      >
                        {item.category}
                      </span>
                    )}
                  </div>
                  {item.normalized_name && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#64748b",
                        fontStyle: "italic",
                        marginBottom: "4px"
                      }}
                    >
                      {item.name}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--primary)",
                        fontWeight: 500,
                      }}
                    >
                      {item.store}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#475569" }}>
                      {item.purchasedAt?.split(" ")[0]}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      color: "var(--success)",
                      fontWeight: 700,
                      fontSize: "1.2rem",
                    }}
                  >
                    R$ {parseBRL(item.unitPrice).toFixed(2).replace(".", ",")}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#475569" }}>
                    por {item.unit || "un."}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

SearchTab.propTypes = {
  savedReceipts: PropTypes.arrayOf(PropTypes.object).isRequired,
  searchQuery: PropTypes.string.isRequired,
  setSearchQuery: PropTypes.func.isRequired,
  sortOrder: PropTypes.string.isRequired,
  setSortOrder: PropTypes.func.isRequired,
  sortDirection: PropTypes.string.isRequired,
  setSortDirection: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default SearchTab;
