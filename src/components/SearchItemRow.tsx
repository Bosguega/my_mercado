import React from "react";
import { Package } from "lucide-react";
import { parseBRL } from "../utils/currency";
import { formatToBR } from "../utils/date";
import type { PurchasedItem } from "../types/ui";

interface SearchItemRowProps {
  item: PurchasedItem & { canonical_name?: string };
}

export const SearchItemRow: React.FC<SearchItemRowProps> = ({ item }) => {
  return (
    <div className="item-row animated-item">
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div className="item-name">
            {item.canonical_name || item.normalized_name || item.name}
          </div>
          {item.canonical_product_id && (
            <span
              style={{
                fontSize: "0.65rem",
                background: "rgba(245, 158, 11, 0.1)",
                padding: "1px 6px",
                borderRadius: "4px",
                color: "#f59e0b",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontWeight: 700,
              }}
            >
              <Package size={12} /> VIP
            </span>
          )}
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
              marginBottom: "4px",
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
            {formatToBR(item.purchasedAt, false)}
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
    </div>
  );
};
