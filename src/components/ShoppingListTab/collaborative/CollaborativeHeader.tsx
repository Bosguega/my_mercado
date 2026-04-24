import { Eraser, Trash2, Users } from "lucide-react";

interface CollaborativeHeaderProps {
  pendingCount: number;
  totalCount: number;
  checkedCount: number;
  onClearChecked: () => void;
  onClearAll: () => void;
}

export function CollaborativeHeader({
  pendingCount,
  totalCount,
  checkedCount,
  onClearChecked,
  onClearAll,
}: CollaborativeHeaderProps) {
  return (
    <div className="shopping-section-header">
      <div>
        <h2 className="section-title" style={{ marginBottom: "0.2rem" }}>
          <Users size={20} color="var(--primary)" />
          Lista de Compras Colaborativa
        </h2>
        <p style={{ color: "#64748b", fontSize: "0.8rem", marginLeft: "1.8rem" }}>
          {pendingCount} pendente(s) de {totalCount}
        </p>
      </div>

      <div className="shopping-icon-actions">
        <button
          className="btn"
          style={{
            padding: "0.45rem 0.6rem",
            background: "rgba(245, 158, 11, 0.15)",
            boxShadow: "none",
            color: "#f59e0b",
          }}
          title="Limpar marcados"
          aria-label="Limpar itens marcados"
          onClick={onClearChecked}
          disabled={checkedCount === 0}
        >
          <Eraser size={16} />
        </button>
        <button
          className="btn"
          style={{
            padding: "0.45rem 0.6rem",
            background: "rgba(239, 68, 68, 0.15)",
            boxShadow: "none",
            color: "#ef4444",
          }}
          title="Limpar lista"
          aria-label="Limpar lista"
          onClick={onClearAll}
          disabled={totalCount === 0}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
