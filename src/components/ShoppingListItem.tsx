import { ArrowRightLeft, CheckCircle2, Circle, Copy, ReceiptText, Trash2 } from "lucide-react";
import { formatBRL } from "../utils/currency";
import { formatToBR } from "../utils/date";
import type { ShoppingListItem } from "../types/ui";
import type { PurchaseHistoryEntry } from "../hooks/queries/usePurchaseHistory";

type ShoppingListItemProps = {
  item: ShoppingListItem;
  history: PurchaseHistoryEntry[];
  historyMatchType?: "exact" | "approx" | "none";
  onToggle: () => void;
  onRemove: () => void;
  transferOptions?: Array<{ id: string; name: string }>;
  transferTargetId?: string;
  onTransferTargetChange?: (targetListId: string) => void;
  onMoveToList?: () => void;
  onCopyToList?: () => void;
  currentUserId?: string | null;
};

export function ShoppingListItem({
  item,
  history,
  historyMatchType = "none",
  onToggle,
  onRemove,
  transferOptions = [],
  transferTargetId = "",
  onTransferTargetChange,
  onMoveToList,
  onCopyToList,
  currentUserId,
}: ShoppingListItemProps) {
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

        <div style={{ flex: 1, minWidth: 0 }}>
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

          {item.quantity && (
            <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "0.15rem" }}>
              Quantidade: {item.quantity}
            </p>
          )}

          {item.checked && item.checked_by_user_id && (
            <p style={{ color: "#94a3b8", fontSize: "0.76rem", marginTop: "0.2rem" }}>
              Marcado por{" "}
              {item.checked_by_user_id === currentUserId
                ? "voce"
                : `${item.checked_by_user_id.slice(0, 8)}...`}
            </p>
          )}

          {transferOptions.length > 0 && (
            <div
              className="shopping-transfer-row"
              style={{
                marginTop: "0.55rem",
              }}
            >
              <select
                className="search-input"
                value={transferTargetId}
                onChange={(event) => onTransferTargetChange?.(event.target.value)}
                aria-label="Selecionar lista destino"
                style={{ minHeight: "34px", padding: "0.3rem 0.45rem" }}
              >
                {transferOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <button
                onClick={onCopyToList}
                style={{
                  background: "rgba(59, 130, 246, 0.15)",
                  border: "none",
                  height: "32px",
                  borderRadius: "8px",
                  color: "#93c5fd",
                  padding: "0 0.6rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  cursor: "pointer",
                }}
                title="Copiar para lista selecionada"
              >
                <Copy size={13} /> Copiar
              </button>
              <button
                onClick={onMoveToList}
                style={{
                  background: "rgba(34, 197, 94, 0.14)",
                  border: "none",
                  height: "32px",
                  borderRadius: "8px",
                  color: "#86efac",
                  padding: "0 0.6rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  cursor: "pointer",
                }}
                title="Mover para lista selecionada"
              >
                <ArrowRightLeft size={13} /> Mover
              </button>
            </div>
          )}

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
                justifyContent: "space-between",
                gap: "0.6rem",
                marginBottom: "0.35rem",
                color: "#94a3b8",
                fontSize: "0.76rem",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <ReceiptText size={14} />
                Ultimas Compras
              </span>
              {historyMatchType !== "none" && (
                <span
                  style={{
                    fontSize: "0.68rem",
                    textTransform: "none",
                    borderRadius: "999px",
                    padding: "0.12rem 0.45rem",
                    border:
                      historyMatchType === "exact"
                        ? "1px solid rgba(34, 197, 94, 0.45)"
                        : "1px solid rgba(250, 204, 21, 0.45)",
                    background:
                      historyMatchType === "exact"
                        ? "rgba(34, 197, 94, 0.18)"
                        : "rgba(250, 204, 21, 0.16)",
                    color: historyMatchType === "exact" ? "#86efac" : "#fde68a",
                  }}
                  title={
                    historyMatchType === "exact"
                      ? "Historico encontrado por chave exata"
                      : "Historico encontrado por aproximacao"
                  }
                >
                  {historyMatchType === "exact" ? "Exato" : "Aproximado"}
                </span>
              )}
            </div>

            {latest ? (
              <>
                <p style={{ color: "#e2e8f0", fontSize: "0.85rem" }}>
                  {formatToBR(latest.date, false)} em {latest.store} por R${" "}
                  {formatBRL(latest.unitPrice)}
                  /un
                </p>
                <p style={{ color: "#64748b", fontSize: "0.78rem", marginTop: "0.2rem" }}>
                  Media recente: R$ {formatBRL(avgPrice)} / un
                </p>

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
                Ainda sem historico de compra para este item.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
