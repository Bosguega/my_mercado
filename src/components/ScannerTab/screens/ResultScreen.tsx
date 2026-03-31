import { ShoppingCart, Plus } from "lucide-react";
import { formatBRL, parseBRL } from "../../../utils/currency";
import type { ReceiptItem } from "../../../types/domain";
import type { ReceiptResultProps } from "../ScannerTab.types";

export function ResultScreen({ currentReceipt, onReset, calculateReceiptTotal }: ReceiptResultProps) {
  const formatItemTotal = (item: ReceiptItem) => {
    if (item.total) return item.total;
    const price = parseBRL(item.price || 0);
    const quantity = parseBRL(item.quantity || item.qty || 1);
    return formatBRL(price * quantity);
  };

  return (
    <div className="glass-card">
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
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
          <ShoppingCart color="white" size={30} />
        </div>
        <h2 style={{ color: "#fff" }}>Nota Salva!</h2>
        <p style={{ color: "var(--success)", fontWeight: 600, fontSize: "1.1rem" }}>
          {currentReceipt.establishment}
        </p>
        <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
          {currentReceipt.date}
        </p>
      </div>

      <div
        className="items-list"
        style={{
          maxHeight: "250px",
          overflowY: "auto",
          marginBottom: "1.5rem",
        }}
      >
        {currentReceipt.items.map((item: ReceiptItem, idx: number) => (
          <div
            key={idx}
            className="item-row"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div className="item-details">
              <span className="item-name" style={{ fontSize: "0.9rem" }}>
                {item.normalized_name || item.name}
              </span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "2px" }}>
                <span className="item-meta">
                  R$ {item.unitPrice ?? formatBRL(item.price)} un x {item.qty ?? item.quantity}
                </span>
                {item.category && (
                  <span
                    style={{
                      fontSize: "0.6rem",
                      background: "rgba(59, 130, 246, 0.1)",
                      padding: "1px 5px",
                      borderRadius: "4px",
                      color: "var(--primary)",
                    }}
                  >
                    {item.category}
                  </span>
                )}
              </div>
            </div>
            <div className="item-total" style={{ fontSize: "1rem" }}>
              R$ {formatItemTotal(item)}
            </div>
          </div>
        ))}
      </div>

      <div className="total-summary" style={{ fontSize: "1.25rem", marginBottom: "2rem" }}>
        <span style={{ color: "#94a3b8", fontWeight: 500 }}>Total</span>
        <span style={{ color: "var(--success)" }}>
          R$ {formatBRL(calculateReceiptTotal(currentReceipt.items))}
        </span>
      </div>

      <button
        className="btn btn-success"
        style={{ width: "100%", padding: "1rem" }}
        onClick={onReset}
      >
        <Plus size={20} />
        Registrar Nova Nota
      </button>
    </div>
  );
}
