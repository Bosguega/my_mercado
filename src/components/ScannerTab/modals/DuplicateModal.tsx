import type { DuplicateModalProps } from "../../../types/scanner";

export function DuplicateModal({ duplicateReceipt, onCancel, onForceSave }: DuplicateModalProps) {
  return (
    <div className="duplicate-modal-overlay" style={{ zIndex: 3000 }}>
      <div className="glass-card duplicate-modal-card">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1.5rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: "24px" }}>⚠️</span>
          </div>
          <h2 style={{ color: "#fff", fontSize: "1.25rem" }}>Nota Já Existente</h2>
        </div>

        <p style={{ color: "#94a3b8", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: "1.6" }}>
          Esta nota fiscal já está no seu histórico desde{" "}
          <strong style={{ color: "#fbbf24" }}>{duplicateReceipt.date}</strong>.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <button
            className="btn"
            onClick={onCancel}
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--card-border)" }}
          >
            Cancelar
          </button>
          <button className="btn btn-success" onClick={onForceSave}>
            Atualizar Nota
          </button>
        </div>

        <p style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "1rem", textAlign: "center" }}>
          Isso substituirá a nota anterior
        </p>
      </div>
    </div>
  );
}
