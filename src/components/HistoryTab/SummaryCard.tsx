import { formatBRL } from "../../utils/currency";
import type { SummaryCardProps } from "./HistoryTab.types";

export function SummaryCard({ totalSpent, filteredCount }: SummaryCardProps) {
  return (
    <div
      className="glass-card"
      style={{
        padding: "1.25rem",
        marginBottom: "1rem",
        background:
          "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)",
        border: "1px solid rgba(59, 130, 246, 0.2)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <p
          style={{
            color: "#94a3b8",
            fontSize: "0.85rem",
            marginBottom: "4px",
          }}
        >
          Total gasto no período
        </p>
        <h3 style={{ color: "#fff", fontSize: "1.8rem", fontWeight: 800 }}>
          R$ {formatBRL(totalSpent)}
        </h3>
      </div>
      <div style={{ textAlign: "right" }}>
        <p
          style={{
            color: "#94a3b8",
            fontSize: "0.85rem",
            marginBottom: "4px",
          }}
        >
          Notas Filtradas
        </p>
        <h4
          style={{
            color: "var(--primary)",
            fontSize: "1.2rem",
            fontWeight: 700,
          }}
        >
          {filteredCount}
        </h4>
      </div>
    </div>
  );
}
