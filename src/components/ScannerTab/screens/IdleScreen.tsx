import { useState, useCallback } from "react";
import { Scan, Camera, Image as ImageIcon, Edit3, LinkIcon, Plus, X, Aperture } from "lucide-react";
import { notify } from "../../../utils/notifications";
import { validateNfcUrl } from "../../../utils/validation";
import type { InitialScannerScreenProps } from "../../../types/scanner";

const styles = {
  actionButton: {
    height: "56px",
    fontSize: "0.95rem",
  },
  primaryButton: {
    width: "100%",
    height: "52px",
    fontSize: "0.95rem",
  },
};

export function IdleScreen({
  onStartCamera,
  onFileUpload,
  onManualMode,
  handleUrlSubmit,
  isLoading,
  isScanning,
  error,
}: InitialScannerScreenProps) {
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedUrl, setPastedUrl] = useState("");

  const onLinkSubmit = useCallback(() => {
    const rawUrl = pastedUrl.trim();

    const validation = validateNfcUrl(rawUrl);

    if (!validation.success) {
      notify.error(validation.error);
      return;
    }

    handleUrlSubmit(validation.data);
    setPastedUrl("");
    setPasteMode(false);
  }, [pastedUrl, handleUrlSubmit]);

  return (
    <div className="glass-card" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <div
          className="pulse-container"
          style={{
            margin: "0 auto",
            width: "80px",
            height: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(59, 130, 246, 0.1)",
            borderRadius: "50%",
          }}
        >
          <Scan size={40} color="var(--primary)" />
        </div>
        <h2 style={{ marginTop: "1.25rem", color: "#f8fafc", fontSize: "1.4rem", fontWeight: 700 }}>
          Escanear Nota Fiscal
        </h2>
        <p style={{ marginTop: "0.5rem", color: "#94a3b8", lineHeight: "1.5", fontSize: "0.95rem" }}>
          Aponte a câmera para o QR Code ou faça upload da galeria.
        </p>
      </div>

      <div className="scanner-action-grid">
        <button
          className="btn"
          style={styles.actionButton}
          onClick={onStartCamera}
          disabled={isLoading || isScanning}
        >
          <Camera size={20} />
          Câmera
        </button>

        <label
          className="btn"
          style={{
            ...styles.actionButton,
            opacity: isLoading || isScanning ? 0.7 : 1,
            cursor: "pointer",
            background: "var(--primary)",
            borderColor: "var(--primary)",
          }}
        >
          <Aperture size={20} />
          Foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileUpload}
            disabled={isLoading || isScanning}
            style={{ display: "none" }}
          />
        </label>

        <label
          className="btn btn-success"
          style={{
            ...styles.actionButton,
            opacity: isLoading || isScanning ? 0.7 : 1,
            cursor: "pointer",
          }}
        >
          <ImageIcon size={20} />
          Galeria
          <input
            type="file"
            accept="image/*"
            onChange={onFileUpload}
            disabled={isLoading || isScanning}
            style={{ display: "none" }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        {!pasteMode ? (
          <button
            className="btn"
            style={{
              ...styles.primaryButton,
              background: "rgba(59, 130, 246, 0.05)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              color: "var(--primary)",
            }}
            onClick={() => setPasteMode(true)}
            disabled={isLoading || isScanning}
          >
            <LinkIcon size={18} />
            Colar Link da Nota
          </button>
        ) : (
          <div
            className="glass-card"
            style={{ padding: "0.75rem", background: "rgba(15, 23, 42, 0.4)", marginBottom: "0" }}
          >
            <div className="scanner-link-row">
              <input
                type="text"
                className="search-input"
                placeholder="URL da NFC-e..."
                value={pastedUrl}
                onChange={(e) => setPastedUrl(e.target.value)}
                autoFocus
                style={{ fontSize: "0.9rem" }}
              />
              <button className="btn btn-success" onClick={onLinkSubmit} style={{ padding: "0 0.75rem" }}>
                <Plus size={20} />
              </button>
              <button
                className="btn"
                onClick={() => setPasteMode(false)}
                style={{
                  padding: "0 0.75rem",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "none",
                  color: "#f87171",
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        className="btn"
        style={{
          ...styles.primaryButton,
          backgroundColor: "transparent",
          border: "1px solid var(--card-border)",
          color: "#64748b",
        }}
        onClick={onManualMode}
        disabled={isLoading || isScanning}
      >
        <Edit3 size={18} />
        Digitar Manualmente
      </button>

      {error && (
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "0.75rem",
            color: "#f87171",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
