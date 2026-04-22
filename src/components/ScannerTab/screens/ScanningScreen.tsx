import { X } from "lucide-react";
import { ScannerView } from "../views/ScannerView";
import type { ScanningScreenProps } from "../../../types/scanner";

export function ScanningScreen({
  onStopCamera,
  torch,
  torchSupported,
  applyTorch,
}: ScanningScreenProps) {
  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <button
          className="btn"
          style={{
            width: "100%",
            background: "rgba(239, 68, 68, 0.2)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#f87171",
          }}
          onClick={onStopCamera}
        >
          <X size={20} />
          Cancelar Escaneamento
        </button>
      </div>
      <ScannerView
        isScanning={true}
        torchSupported={torchSupported}
        torch={torch}
        applyTorch={applyTorch}
      />
    </>
  );
}
