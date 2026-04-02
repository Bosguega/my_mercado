/**
 * PWA Update Notification Component
 *
 * Mostra toast quando há nova versão disponível.
 */

import { useEffect } from "react";
import { toast } from "react-hot-toast";
import { usePWAUpdate } from "../hooks/usePWAUpdate";

export function PWAUpdateNotification() {
  const { updateAvailable, readyToInstall, updateApp } = usePWAUpdate();

  useEffect(() => {
    if (updateAvailable && readyToInstall) {
      toast(
        (t) => (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div>
              <strong>Nova versão disponível!</strong>
              <p style={{ fontSize: "0.875rem", opacity: 0.9, marginTop: "4px" }}>
                Recarregue para aplicar as atualizações.
              </p>
            </div>
            <button
              onClick={() => {
                updateApp();
                toast.dismiss(t.id);
              }}
              style={{
                background: "var(--primary)",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.875rem",
              }}
            >
              Atualizar
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              style={{
                background: "transparent",
                color: "currentColor",
                border: "1px solid currentColor",
                padding: "8px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Depois
            </button>
          </div>
        ),
        {
          duration: Infinity, // Não expira
          position: "top-center",
          style: {
            background: "rgba(15, 23, 42, 0.95)",
            color: "#fff",
            borderRadius: "12px",
            border: "1px solid rgba(59, 130, 246, 0.5)",
            backdropFilter: "blur(8px)",
            maxWidth: "400px",
          },
          icon: "🔄",
        }
      );
    }
  }, [updateAvailable, readyToInstall, updateApp]);

  return null; // Componente não renderiza nada visível
}
