import { useState, lazy, Suspense } from "react";
import {
  Settings,
  Trash2,
  Cpu,
  LogOut,
  Database,
  BookOpen,
  Package,
  ChevronRight,
  Wifi,
  RefreshCw,
} from "lucide-react";
import { notify } from "../utils/notifications";
import { logout } from "../services/authService";
import {
  clearReceiptsAndItemsFromDB,
  clearDictionaryInDB,
  clearCanonicalProductsInDB,
} from "../services";
import { syncShoppingListsWithCloud } from "../services/shoppingListCloudSyncService";
import { useScannerStore } from "../stores/useScannerStore";
import { useReceiptsSessionStore } from "../stores/useReceiptsSessionStore";
import { testSupabaseConnection } from "../utils/supabaseTest";
import {
  isShoppingListCloudSyncEnabled,
  setShoppingListCloudSyncEnabled,
} from "../utils/shoppingListCloudSync";
import ConfirmDialog from "./ConfirmDialog";
import { TabSkeleton as SubTabSkeleton } from "./Skeleton";
import type { ConfirmDialogConfig } from "../types/ui";

const DictionaryTab = lazy(() => import("./DictionaryTab"));
const CanonicalProductsTab = lazy(() =>
  import("./CanonicalProductsTab/index").then((module) => ({ default: module.CanonicalProductsTab })),
);

interface SettingsTabProps {
  onOpenAiConfig: () => void;
}

export default function SettingsTab({ onOpenAiConfig }: SettingsTabProps) {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncListsEnabled, setSyncListsEnabled] = useState(() => isShoppingListCloudSyncEnabled());
  const [activeSubTab, setActiveSubTab] = useState<"main" | "dictionary" | "products">("main");

  const resetScannerState = useScannerStore((state) => state.resetScannerState);
  const sessionUserId = useReceiptsSessionStore((state) => state.sessionUserId);

  const handleLogout = async () => {
    setConfirmDialog({
      title: "Encerrar sessão?",
      message: "Você precisará fazer login novamente para acessar seus dados.",
      confirmText: "Sair",
      danger: true,
      onConfirm: async () => {
        resetScannerState();
        await logout();
        notify.sessionEnded();
      },
    });
  };

  const handleClearHistory = async () => {
    setConfirmDialog({
      title: "Limpar histórico?",
      message: "Esta ação não pode ser desfeita. Todas as notas fiscais serão apagadas.",
      confirmText: "Limpar",
      danger: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          await clearReceiptsAndItemsFromDB();
          notify.success("Histórico limpo com sucesso!");
        } catch {
          notify.errorByKey("SETTINGS_CLEAR_HISTORY_FAILED");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleClearDictionary = async () => {
    setConfirmDialog({
      title: "Limpar dicionário?",
      message: "Esta ação não pode ser desfeita. Todas as normalizações serão apagadas.",
      confirmText: "Limpar",
      danger: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          await clearDictionaryInDB();
          notify.success("Dicionário limpo com sucesso!");
        } catch {
          notify.errorByKey("SETTINGS_CLEAR_DICTIONARY_FAILED");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleClearCanonicalProducts = async () => {
    setConfirmDialog({
      title: "Limpar produtos canônicos?",
      message: "Esta ação não pode ser desfeita. Todos os produtos canônicos serão apagados.",
      confirmText: "Limpar",
      danger: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          await clearCanonicalProductsInDB();
          notify.success("Produtos canônicos limpos com sucesso!");
        } catch {
          notify.errorByKey("SETTINGS_CLEAR_PRODUCTS_FAILED");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleTestConnection = async () => {
    setLoading(true);
    const status = await testSupabaseConnection();
    setLoading(false);

    if (!status.configured) {
      notify.errorByKey("SUPABASE_NOT_CONFIGURED");
      return;
    }

    if (!status.authenticated) {
      notify.errorByKey("AUTH_SESSION_INVALID");
      return;
    }

    if (status.databaseAccessible) {
      notify.success("Conexão com Supabase estabelecida com sucesso!");
    } else {
      notify.error(status.error ?? "Falha ao validar conexão com o banco de dados.");
    }
  };

  const handleToggleCloudSync = () => {
    const next = !syncListsEnabled;
    setSyncListsEnabled(next);
    setShoppingListCloudSyncEnabled(next);

    notify.success(
      next
        ? "Sincronização de listas com nuvem ativada."
        : "Sincronização de listas com nuvem desativada.",
    );
  };

  const handleSyncListsNow = async () => {
    if (!syncListsEnabled) {
      notify.errorByKey("SETTINGS_SYNC_REQUIRED");
      return;
    }

    if (!sessionUserId) {
      notify.errorByKey("AUTH_SESSION_INVALID");
      return;
    }

    setLoading(true);
    try {
      const result = await syncShoppingListsWithCloud(sessionUserId);
      if (result.status === "pushed") {
        notify.success("Listas enviadas para a nuvem.");
      } else if (result.status === "pulled") {
        notify.success("Listas atualizadas a partir da nuvem.");
      } else if (result.status === "unchanged") {
        notify.warning("Listas já estavam sincronizadas.");
      } else {
        notify.errorByKey("SETTINGS_SYNC_FAILED");
      }
    } catch {
      notify.errorByKey("SETTINGS_SYNC_FAILED");
    } finally {
      setLoading(false);
    }
  };

  const renderSubTab = () => {
    if (activeSubTab === "dictionary") {
      return (
        <Suspense fallback={<SubTabSkeleton />}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setActiveSubTab("main")}
              className="btn btn-secondary"
              style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              Voltar para Configuracoes
            </button>
            <DictionaryTab />
          </div>
        </Suspense>
      );
    }

    if (activeSubTab === "products") {
      return (
        <Suspense fallback={<SubTabSkeleton />}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setActiveSubTab("main")}
              className="btn btn-secondary"
              style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              Voltar para Configuracoes
            </button>
            <CanonicalProductsTab />
          </div>
        </Suspense>
      );
    }

    return null;
  };

  const renderMainScreen = () => (
    <div className="settings-container" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <section className="glass-card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Settings size={20} />
          Conta
        </h2>

        <button
          onClick={handleLogout}
          className="btn btn-danger"
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <LogOut size={18} />
            Encerrar Sessao
          </span>
          <ChevronRight size={18} />
        </button>
      </section>

      <section className="glass-card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Database size={20} />
          Gerenciar Dados
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button
            onClick={() => setActiveSubTab("dictionary")}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <BookOpen size={18} />
              Dicionario de Produtos
            </span>
            <ChevronRight size={18} />
          </button>

          <button
            onClick={() => setActiveSubTab("products")}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Package size={18} />
              Produtos Canonicos
            </span>
            <ChevronRight size={18} />
          </button>

          <button
            onClick={handleClearHistory}
            className="btn btn-danger"
            disabled={loading}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Trash2 size={18} />
              Limpar Historico
            </span>
            <ChevronRight size={18} />
          </button>

          <button
            onClick={handleClearDictionary}
            className="btn btn-danger"
            disabled={loading}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Trash2 size={18} />
              Limpar Dicionario
            </span>
            <ChevronRight size={18} />
          </button>

          <button
            onClick={handleClearCanonicalProducts}
            className="btn btn-danger"
            disabled={loading}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Trash2 size={18} />
              Limpar Produtos Canonicos
            </span>
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <section className="glass-card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Cpu size={20} />
          Inteligencia Artificial
        </h2>

        <button
          onClick={onOpenAiConfig}
          className="btn btn-primary"
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Cpu size={18} />
            Configurar API Key
          </span>
          <ChevronRight size={18} />
        </button>
      </section>

      <section className="glass-card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Wifi size={20} />
          Conexao
        </h2>

        <button
          onClick={handleTestConnection}
          className="btn btn-secondary"
          disabled={loading}
          style={{ width: "100%" }}
        >
          Testar Conexao com Supabase
        </button>

        <div
          style={{
            marginTop: "0.8rem",
            paddingTop: "0.8rem",
            borderTop: "1px solid rgba(148,163,184,0.2)",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#cbd5e1" }}>
            <input type="checkbox" checked={syncListsEnabled} onChange={handleToggleCloudSync} />
            Sincronizar listas de compras com nuvem
          </label>

          <button
            onClick={handleSyncListsNow}
            className="btn btn-secondary"
            disabled={loading || !syncListsEnabled}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <RefreshCw size={16} />
            Sincronizar listas agora
          </button>
        </div>
      </section>

      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          danger={confirmDialog.danger}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );

  return <div className="settings-tab">{activeSubTab === "main" ? renderMainScreen() : renderSubTab()}</div>;
}
