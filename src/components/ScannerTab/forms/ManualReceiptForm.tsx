import { Edit3, X, Save, Plus } from "lucide-react";
import { formatBRL } from "../../../utils/currency";
import type { ReceiptItem } from "../../../types/domain";
import type { ManualReceiptFormProps } from "../ScannerTab.types";

const styles = {
  header: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center",
    marginBottom: "1.5rem",
    borderBottom: "1px solid var(--card-border)",
    paddingBottom: "1rem",
  },
  title: {
    color: "#fff" as const,
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "0.6rem" as const,
    fontSize: "1.4rem",
  },
  iconButton: {
    background: "rgba(255,255,255,0.05)",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer" as const,
    borderRadius: "50%",
    width: "36px",
    height: "36px",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  inputGroup: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "0.75rem",
    marginBottom: "1.5rem",
  },
  sectionCard: {
    background: "rgba(15,23,42,0.4)",
    padding: "1.25rem",
    borderRadius: "1rem",
    marginBottom: "1.5rem",
    border: "1px solid var(--card-border)",
  },
  sectionTitle: {
    color: "#e2e8f0",
    marginBottom: "1rem",
    fontSize: "0.9rem",
    fontWeight: 600,
  },
};

export function ManualReceiptForm({
  manualData,
  setManualData,
  manualItem,
  setManualItem,
  onAddManualItem,
  onSaveManualReceipt,
  onCancel,
  calculateReceiptTotal,
}: ManualReceiptFormProps) {
  return (
    <div className="glass-card">
      <div style={styles.header}>
        <h2 style={styles.title}>
          <Edit3 color="var(--primary)" size={24} />
          Cadastro Manual
        </h2>
        <button onClick={onCancel} style={styles.iconButton}>
          <X size={20} />
        </button>
      </div>

      <div style={styles.inputGroup}>
        <input
          type="text"
          className="search-input"
          placeholder="Nome do Mercado"
          value={manualData.establishment}
          onChange={(e) => setManualData({ ...manualData, establishment: e.target.value })}
        />
        <input
          type="text"
          className="search-input"
          placeholder="Data (DD/MM/AAAA)"
          value={manualData.date}
          onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
        />
      </div>

      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>ADICIONAR ITEM</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <input
            type="text"
            className="search-input"
            style={{ background: "var(--bg-color)" }}
            placeholder="Nome do Produto"
            value={manualItem.name}
            onChange={(e) => setManualItem({ ...manualItem, name: e.target.value })}
          />
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <input
              type="number"
              className="search-input"
              style={{ width: "85px", background: "var(--bg-color)" }}
              placeholder="Qtd"
              value={manualItem.qty}
              onChange={(e) => setManualItem({ ...manualItem, qty: e.target.value })}
            />
            <input
              type="text"
              className="search-input"
              style={{ flex: 1, background: "var(--bg-color)" }}
              placeholder="Valor (ex: 5,90)"
              value={manualItem.unitPrice}
              onChange={(e) => setManualItem({ ...manualItem, unitPrice: e.target.value })}
            />
            <button
              className="btn"
              style={{ padding: "0 1.25rem" }}
              onClick={onAddManualItem}
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      {manualData.items.length > 0 && (
        <div
          className="items-list"
          style={{
            marginBottom: "1.5rem",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {manualData.items.map((it: ReceiptItem, idx: number) => (
            <div
              key={idx}
              className="item-row"
              style={{
                padding: "0.8rem",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div className="item-details">
                <span className="item-name" style={{ fontSize: "0.95rem" }}>
                  {it.name}
                </span>
                <span className="item-meta">
                  {it.quantity} x R$ {formatBRL(it.price)}
                </span>
              </div>
              <div className="item-total" style={{ fontSize: "1.1rem" }}>
                R$ {it.total}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn btn-success"
        style={{ width: "100%", padding: "1.1rem", fontSize: "1.1rem" }}
        onClick={onSaveManualReceipt}
        disabled={manualData.items.length === 0}
      >
        <Save size={20} />
        Finalizar e Salvar
      </button>

      {manualData.items.length > 0 && (
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
            Total: R$ {formatBRL(calculateReceiptTotal(manualData.items))}
          </p>
        </div>
      )}
    </div>
  );
}
