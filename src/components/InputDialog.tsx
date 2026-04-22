import { useEffect, useId, useState } from "react";

type InputDialogProps = {
  isOpen: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
  busy?: boolean;
  onConfirm: (value: string) => void | Promise<void>;
  onCancel: () => void;
};

export default function InputDialog({
  isOpen,
  title,
  message,
  placeholder,
  initialValue = "",
  confirmText = "Salvar",
  cancelText = "Cancelar",
  busy = false,
  onConfirm,
  onCancel,
}: InputDialogProps) {
  const inputId = useId();
  const [value, setValue] = useState(initialValue);
  const isInvalid = !value.trim();

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  return (
    <div className="duplicate-modal-overlay" style={{ zIndex: 4600 }}>
      <div className="glass-card duplicate-modal-card shopping-input-dialog-card">
        <h3 style={{ color: "#fff", marginBottom: "0.75rem" }}>{title}</h3>
        {message && (
          <p style={{ color: "#94a3b8", lineHeight: "1.5", marginBottom: "0.85rem" }}>{message}</p>
        )}
        <div style={{ marginBottom: "0.95rem" }}>
          <label htmlFor={inputId} style={{ display: "none" }}>
            {title}
          </label>
          <input
            id={inputId}
            className="search-input"
            placeholder={placeholder}
            value={value}
            autoFocus
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !busy) {
                event.preventDefault();
                if (!isInvalid) void onConfirm(value);
              }
            }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <button
            className="btn"
            onClick={onCancel}
            disabled={busy}
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--card-border)" }}
          >
            {cancelText}
          </button>
          <button
            className="btn btn-success"
            onClick={() => void onConfirm(value)}
            disabled={busy || isInvalid}
          >
            {busy ? "Salvando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
