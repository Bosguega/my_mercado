import { Zap, ZapOff } from "lucide-react";
import type { ScannerViewProps } from "../ScannerTab.types";

const styles = {
  cameraControl: {
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    border: "2px solid var(--primary)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  },
};

export function ScannerView({
  isScanning,
  torchSupported,
  torch,
  applyTorch,
}: ScannerViewProps) {
  if (!isScanning) return null;

  return (
    <div
      className="scanner-container"
      style={{
        display: "block",
        background: "#000",
        borderRadius: "1rem",
        overflow: "hidden",
        border: "2px solid var(--primary)",
        width: "100%",
        maxWidth: "500px",
        margin: "0 auto",
        position: "relative",
        minHeight: "400px",
      }}
    >
      {/* Elemento div para o html5-qrcode */}
      <div
        id="reader"
        style={{
          width: "100%",
          minHeight: "400px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "220px",
          height: "220px",
          border: "2px solid var(--success)",
          borderRadius: "1rem",
          boxShadow: "0 0 0 4000px rgba(15, 23, 42, 0.7)",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -35,
            width: "100%",
            textAlign: "center",
            color: "#fff",
            fontSize: "0.85rem",
            fontWeight: "bold",
          }}
        >
          Alinhe o QR Code
        </div>
        <div
          style={{
            position: "absolute",
            bottom: -35,
            width: "100%",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: "0.75rem",
          }}
        >
          Dica: Afaste um pouco para melhor leitura
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "1.25rem",
          right: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          zIndex: 10,
        }}
      >
        {torchSupported && (
          <button
            onClick={() => applyTorch(!torch)}
            style={{
              ...styles.cameraControl,
              background: torch ? "var(--primary)" : "rgba(15, 23, 42, 0.9)",
            }}
          >
            {torch ? <ZapOff size={24} /> : <Zap size={24} />}
          </button>
        )}
      </div>
    </div>
  );
}
