import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { formatBRL, parseBRL } from "../../../utils/currency";
import { formatToBR } from "../../../utils/date";
import type { ReceiptItem } from "../../../types/domain";
import type { ReceiptResultProps } from "../../../types/scanner";

export function ResultScreen({ currentReceipt, onReset, calculateReceiptTotal }: ReceiptResultProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const displayDate = formatToBR(currentReceipt.date) || currentReceipt.date;

  const formatItemTotal = (item: ReceiptItem) => {
    if (item.total) return formatBRL(item.total);
    const price = parseBRL(item.price || 0);
    const quantity = parseBRL(item.quantity || 1);
    return formatBRL(price * quantity);
  };

  const total = calculateReceiptTotal(currentReceipt.items);

  return (
    <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header com ícone de sucesso */}
      <div
        style={{
          background: "rgba(16, 185, 129, 0.1)",
          padding: "1.5rem",
          textAlign: "center",
          borderBottom: "1px solid rgba(16, 185, 129, 0.2)",
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "var(--success)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
          }}
        >
          <CheckCircle color="white" size={32} />
        </div>
        <h2 style={{ color: "#fff", marginBottom: "0.5rem" }}>Nota Escaneada!</h2>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
          Revise os itens abaixo e confirme
        </p>
      </div>

      {/* Corpo do ReceiptCard (mesmo formato do histórico) */}
      <div>
        {/* Header do card */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            padding: "1.25rem",
            cursor: "pointer",
            borderBottom: isExpanded ? "1px solid rgba(255,255,255,0.05)" : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "0.5rem",
            }}
          >
            <div>
              <h3
                style={{
                  color: "#f8fafc",
                  fontSize: "1.1rem",
                  marginBottom: "0.25rem",
                }}
              >
                {currentReceipt.establishment}
              </h3>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                  {displayDate}
                </span>
                <span
                  style={{
                    background: "rgba(59, 130, 246, 0.2)",
                    color: "var(--primary)",
                    padding: "0.1rem 0.5rem",
                    borderRadius: "1rem",
                    fontSize: "0.75rem",
                  }}
                >
                  {currentReceipt.items.length} itens
                </span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <span
                style={{
                  color: "var(--success)",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  whiteSpace: "nowrap",
                }}
              >
                R$ {total.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "0.5rem",
              color: "#64748b",
            }}
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>

        {/* Lista de itens expandida */}
        {isExpanded && (
          <div
            style={{
              background: "rgba(15, 23, 42, 0.3)",
              padding: "1rem",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {currentReceipt.items.map((item: ReceiptItem, idx: number) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.6rem 0",
                  borderBottom:
                    idx === currentReceipt.items.length - 1
                      ? "none"
                      : "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "0.9rem",
                      color: "#e2e8f0",
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {item.normalized_name || item.name}
                    {item.category && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          background: "rgba(255,255,255,0.1)",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          color: "#94a3b8",
                          fontWeight: "normal",
                        }}
                      >
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      fontStyle: item.normalized_name ? "italic" : "normal",
                    }}
                  >
                    {item.normalized_name
                      ? `${item.quantity} x R$ ${formatBRL(item.price)}`
                      : `${item.quantity} x R$ ${formatBRL(item.price)}`}
                  </div>
                </div>
                <div
                  style={{
                    color: "#cbd5e1",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                  }}
                >
                  R$ {formatItemTotal(item)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total e Botões de ação */}
      <div
        style={{
          padding: "1.25rem",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(15, 23, 42, 0.3)",
        }}
      >
        <div
          className="total-summary"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            fontSize: "1.25rem",
          }}
        >
          <span style={{ color: "#94a3b8", fontWeight: 500 }}>Total da Nota</span>
          <span style={{ color: "var(--success)", fontWeight: 700 }}>
            R$ {total.toFixed(2).replace(".", ",")}
          </span>
        </div>

        <button
          className="btn btn-success"
          style={{ width: "100%", padding: "1rem", fontSize: "1rem", fontWeight: 600 }}
          onClick={onReset}
        >
          <CheckCircle size={20} />
          Confirmar e Concluir
        </button>
      </div>
    </div>
  );
}
