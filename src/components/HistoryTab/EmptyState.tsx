import { History } from "lucide-react";
import type { EmptyStateProps } from "../HistoryTab.types";

export function EmptyState({ onRestore }: EmptyStateProps) {
  return (
    <div
      className="glass-card"
      style={{ textAlign: "center", padding: "4rem 1rem" }}
    >
      <div style={{ position: "relative", display: "inline-block" }}>
        <History
          size={64}
          color="var(--primary)"
          style={{ opacity: 0.2 }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <History size={32} color="var(--primary)" />
        </div>
      </div>
      <h2 style={{ marginTop: "1.5rem", color: "#e2e8f0" }}>
        Histórico vazio
      </h2>
      <p
        style={{
          color: "#94a3b8",
          marginTop: "0.5rem",
          maxWidth: "300px",
          margin: "0.5rem auto",
        }}
      >
        Suas notas fiscais escaneadas aparecerão aqui para você acompanhar
        preços e economizar.
      </p>
      <p
        style={{
          color: "var(--primary)",
          fontSize: "0.85rem",
          marginTop: "1.5rem",
          fontWeight: 500,
        }}
      >
        Você também pode restaurar um backup JSON acima.
      </p>
    </div>
  );
}
