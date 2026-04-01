import { memo } from "react";
import { ArrowLeft } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PriceChartProps {
  chartData: Array<Record<string, string | number>>;
  groupedItems: Record<string, unknown[]>;
  onBack: () => void;
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f43f5e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

/**
 * Componente de gráfico de tendência de preços
 * Lazy loaded para não carregar recharts no bundle inicial
 */
export const PriceChart = memo(function PriceChart({
  chartData,
  groupedItems,
  onBack,
}: PriceChartProps) {
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
          <LineChart data={chartData}>
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
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: COLORS[idx % COLORS.length] }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default PriceChart;
