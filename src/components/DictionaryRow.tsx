import React from "react";
import { Edit3, Trash2, Package } from "lucide-react";
import type { DictionaryEntry } from "../types/domain";
import type { CanonicalProduct } from "../types/domain";

interface DictionaryRowProps {
  item: DictionaryEntry;
  onEdit: (item: DictionaryEntry) => void;
  onDelete: (key: string) => void;
  products: CanonicalProduct[];
}

export const DictionaryRow: React.FC<DictionaryRowProps> = ({
  item,
  onEdit,
  onDelete,
  products,
}) => {
  const linkedProduct = item.canonical_product_id
    ? products.find((p) => p.id === item.canonical_product_id)
    : null;

  return (
    <div
      className="glass-card animated-item"
      style={{ marginBottom: 0, padding: "1rem" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <span style={{ color: "#fff", fontWeight: 600 }}>
              {item.normalized_name || "Sem nome"}
            </span>
            <span
              style={{
                fontSize: "0.65rem",
                background: "rgba(59, 130, 246, 0.1)",
                padding: "1px 6px",
                borderRadius: "4px",
                color: "var(--primary)",
              }}
            >
              {item.category || "Outros"}
            </span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontStyle: "italic" }}>
            ID: {item.key}
          </div>
          {item.canonical_product_id && (
            <div
              style={{
                fontSize: "0.75rem",
                color: "#fbbf24",
                marginTop: "2px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Package size={12} />
              Vínculo VIP: {linkedProduct?.name || "Produto Carregando..."}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => onEdit(item)}
            style={{
              background: "rgba(59, 130, 246, 0.1)",
              border: "none",
              borderRadius: "8px",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary)",
            }}
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={() => onDelete(item.key)}
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "none",
              borderRadius: "8px",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ef4444",
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
