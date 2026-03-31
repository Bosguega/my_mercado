import { CheckCircle2, Circle, ReceiptText, Trash2 } from "lucide-react";
import { formatBRL } from "../utils/currency";
import { formatToBR } from "../utils/date";
import type { ShoppingListItem } from "../types/ui";
import type { PurchaseHistoryEntry } from "../hooks/queries/usePurchaseHistory";

type ShoppingListItemProps = {
  item: ShoppingListItem;
  history: PurchaseHistoryEntry[];
  onToggle: () => void;
  onRemove: () => void;
};

/**
 * ShoppingListItem - Item individual da lista de compras
 * 
 * Exibe:
 * - Nome do item e quantidade
 * - Checkbox para marcar/desmarcar
 * - Histórico de compras (últimos 3 preços)
 * - Preço médio recente
 * - Botão de remover
 * 
 * @example
 * ```tsx
 * <ShoppingListItem
 *   item={item}
 *   history={recentHistory}
 *   onToggle={() => toggleChecked(sessionUserId, item.id)}
 *   onRemove={() => removeItem(sessionUserId, item.id)}
 * />
 * ```
 */
export function ShoppingListItem({ item, history, onToggle, onRemove }: ShoppingListItemProps) {
  const latest = history[0];
  const avgPrice =
    history.length > 0
      ? history.reduce((acc, entry) => acc + entry.unitPrice, 0) / history.length
      : 0;

  return (
    <div
      className="glass-card animated-item"
      style={{
        padding: "1rem",
        marginBottom: 0,
        border: item.checked
          ? "1px solid rgba(16, 185, 129, 0.3)"
          : "1px solid var(--card-border)",
        opacity: item.checked ? 0.75 : 1,
      }}
    >
      <div style={{ display: "flex", gap: "0.8rem", alignItems: "flex-start" }}>
        {/* Checkbox */}
        <button
          onClick={onToggle}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            color: item.checked ? "var(--success)" : "#64748b",
            cursor: "pointer",
            marginTop: "0.2rem",
          }}
          aria-label={item.checked ? "Desmarcar item" : "Marcar item"}
        >
          {item.checked ? <CheckCircle2 size={22} /> : <Circle size={22} />}
        </button>

        {/* Conteúdo */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header: Nome + Botão remover */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
            }}
          >
            <h3
              style={{
                color: "#f8fafc",
                fontSize: "1rem",
                textDecoration: item.checked ? "line-through" : "none",
                wordBreak: "break-word",
              }}
            >
              {item.name}
            </h3>
            <button
              onClick={onRemove}
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "none",
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ef4444",
                cursor: "pointer",
                flexShrink: 0,
              }}
              title="Remover item"
            >
              <Trash2 size={15} />
            </button>
          </div>

          {/* Quantidade */}
          {item.quantity && (
            <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "0.15rem" }}>
              Quantidade: {item.quantity}
            </p>
          )}

          {/* Seção de Histórico */}
          <div
            style={{
              marginTop: "0.65rem",
              padding: "0.7rem",
              borderRadius: "0.8rem",
              background: "rgba(15, 23, 42, 0.45)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                marginBottom: "0.35rem",
                color: "#94a3b8",
                fontSize: "0.76rem",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              <ReceiptText size={14} />
              Últimas Compras
            </div>

            {latest ? (
              <>
                <p style={{ color: "#e2e8f0", fontSize: "0.85rem" }}>
                  {formatToBR(latest.date, false)} em {latest.store} por R${" "}
                  {formatBRL(latest.unitPrice)}
                  /un
                </p>
                <p style={{ color: "#64748b", fontSize: "0.78rem", marginTop: "0.2rem" }}>
                  Média recente: R$ {formatBRL(avgPrice)} / un
                </p>

                {/* Tags de histórico */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.4rem",
                    marginTop: "0.45rem",
                  }}
                >
                  {history.map((entry, idx) => (
                    <span
                      key={`${entry.key}_${entry.timestamp}_${idx}`}
                      style={{
                        fontSize: "0.72rem",
                        color: "#93c5fd",
                        border: "1px solid rgba(59,130,246,0.28)",
                        background: "rgba(59,130,246,0.12)",
                        borderRadius: "999px",
                        padding: "0.15rem 0.5rem",
                      }}
                    >
                      {formatToBR(entry.date, false)}: R$ {formatBRL(entry.unitPrice)}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: "#64748b", fontSize: "0.82rem" }}>
                Ainda sem histórico de compra para este item.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
