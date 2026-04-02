import { useState } from "react";
import { ListChecks, Users } from "lucide-react";
import { useReceiptsSessionStore } from "../../stores/useReceiptsSessionStore";
import { LocalShoppingListTab } from "./LocalShoppingListTab";
import { CollaborativeShoppingListTab } from "./CollaborativeShoppingListTab";
import type { ShoppingMode } from "./ShoppingListTab.types";

/**
 * Componente principal da Lista de Compras
 *
 * Orquestra os modos local e colaborativo,
 * permitindo que o usuário alterne entre eles.
 *
 * @example
 * ```tsx
 * <ShoppingListTab />
 * ```
 */
export default function ShoppingListTab() {
  const sessionUserId = useReceiptsSessionStore((state) => state.sessionUserId);
  const isAuthenticated = Boolean(sessionUserId);

  const [mode, setMode] = useState<ShoppingMode>("local");

  const handleSwitchToCollab = () => {
    if (!isAuthenticated) {
      setMode("local");
      return;
    }
    setMode("collab");
  };

  const handleSwitchToLocal = () => {
    setMode("local");
  };

  return (
    <div>
      {/* Header com seletor de modo */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          gap: "1rem",
        }}
      >
        <div>
          <h2 className="section-title" style={{ marginBottom: "0.2rem" }}>
            {mode === "local" ? (
              <>
                <ListChecks size={20} color="var(--primary)" />
                Lista de Compras
              </>
            ) : (
              <>
                <Users size={20} color="var(--primary)" />
                Lista Colaborativa
              </>
            )}
          </h2>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn"
            style={{
              background: mode === "local" ? "var(--primary-gradient)" : "rgba(255,255,255,0.08)",
              boxShadow: mode === "local" ? undefined : "none",
            }}
            onClick={handleSwitchToLocal}
          >
            Lista Local
          </button>
          <button
            className="btn"
            style={{
              background:
                mode === "collab" ? "linear-gradient(135deg,#0ea5e9,#2563eb)" : "rgba(255,255,255,0.08)",
              boxShadow: mode === "collab" ? undefined : "none",
              opacity: isAuthenticated ? 1 : 0.7,
            }}
            onClick={handleSwitchToCollab}
            disabled={!isAuthenticated}
            title={!isAuthenticated ? "Faca login para usar listas colaborativas" : undefined}
          >
            <Users size={15} /> Colaborativa
          </button>
        </div>
      </div>

      {/* Renderiza o componente apropriado baseado no modo */}
      {mode === "local" ? (
        <LocalShoppingListTab onSwitchToCollab={handleSwitchToCollab} />
      ) : (
        <CollaborativeShoppingListTab onSwitchToLocal={handleSwitchToLocal} />
      )}
    </div>
  );
}
