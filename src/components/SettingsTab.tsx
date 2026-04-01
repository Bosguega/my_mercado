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
} from "lucide-react";
import { toast } from "react-hot-toast";
import { logout } from "../services/authService";
import {
  clearReceiptsAndItemsFromDB,
  clearDictionaryInDB,
  clearCanonicalProductsInDB
} from "../services";
import { useScannerStore } from "../stores/useScannerStore";
import { testSupabaseConnection } from "../utils/supabaseTest";
import ConfirmDialog from "./ConfirmDialog";
import type { ConfirmDialogConfig } from "../types/ui";

// Lazy loading das abas pesadas
const DictionaryTab = lazy(() => import("./DictionaryTab"));
const CanonicalProductsTab = lazy(() => import("./CanonicalProductsTab"));

interface SettingsTabProps {
  onOpenAiConfig: () => void;
}

// Componente de loading para Suspense
const SubTabSkeleton = () => (
  <div className="glass-card" style={{ padding: "2rem", textAlign: "center" }}>
    <div className="skeleton-line" style={{ width: "60%", height: "20px", margin: "0 auto 1rem" }} />
    <div className="skeleton-line" style={{ width: "80%", height: "16px", margin: "0 auto" }} />
  </div>
);

export default function SettingsTab({ onOpenAiConfig }: SettingsTabProps) {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'main' | 'dictionary' | 'products'>('main');
  const resetScannerState = useScannerStore((state) => state.resetScannerState);

  const handleLogout = async () => {
    setConfirmDialog({
      title: "Encerrar sessão?",
      message: "Você precisará fazer login novamente para acessar seus dados.",
      confirmText: "Sair",
      danger: true,
      onConfirm: async () => {
        resetScannerState();
        await logout();
        toast.success("Sessão encerrada.");
      }
    });
  };

  const handleClearHistory = async () => {
    setConfirmDialog({
      title: "Limpar histórico?",
      message: "Esta ação não pode ser desfeita. Todas as suas notas fiscais serão apagadas.",
      confirmText: "Limpar",
      danger: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          await clearReceiptsAndItemsFromDB();
          toast.success("Histórico limpo com sucesso!");
        } catch {
          toast.error("Erro ao limpar histórico.");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleClearDictionary = async () => {
    setConfirmDialog({
      title: "Limpar dicionário?",
      message: "Esta ação não pode ser desfeita. Todas as normalizações de produtos serão apagadas.",
      confirmText: "Limpar",
      danger: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          await clearDictionaryInDB();
          toast.success("Dicionário limpo com sucesso!");
        } catch {
          toast.error("Erro ao limpar dicionário.");
        } finally {
          setLoading(false);
        }
      }
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
          toast.success("Produtos canônicos limpos com sucesso!");
        } catch {
          toast.error("Erro ao limpar produtos canônicos.");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleTestConnection = async () => {
    setLoading(true);
    const success = await testSupabaseConnection();
    setLoading(false);

    if (success) {
      toast.success("Conexão com Supabase estabelecida com sucesso!");
    } else {
      toast.error("Falha ao conectar com Supabase. Verifique as variáveis de ambiente.");
    }
  };

  // Renderiza sub-abas com lazy loading
  const renderSubTab = () => {
    if (activeSubTab === 'dictionary') {
      return (
        <Suspense fallback={<SubTabSkeleton />}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setActiveSubTab('main')}
              className="btn btn-secondary"
              style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              ← Voltar para Configurações
            </button>
            <DictionaryTab />
          </div>
        </Suspense>
      );
    }

    if (activeSubTab === 'products') {
      return (
        <Suspense fallback={<SubTabSkeleton />}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setActiveSubTab('main')}
              className="btn btn-secondary"
              style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              ← Voltar para Configurações
            </button>
            <CanonicalProductsTab />
          </div>
        </Suspense>
      );
    }

    return null;
  };

  // Renderiza tela principal
  const renderMainScreen = () => (
    <div className="settings-container" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Sessão de Conta */}
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
            Encerrar Sessão
          </span>
          <ChevronRight size={18} />
        </button>
      </section>

      {/* Sessão de Dados */}
      <section className="glass-card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Database size={20} />
          Gerenciar Dados
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button
            onClick={() => setActiveSubTab('dictionary')}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <BookOpen size={18} />
              Dicionário de Produtos
            </span>
            <ChevronRight size={18} />
          </button>

          <button
            onClick={() => setActiveSubTab('products')}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Package size={18} />
              Produtos Canônicos
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
              Limpar Histórico
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
              Limpar Dicionário
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
              Limpar Produtos Canônicos
            </span>
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* Sessão de IA */}
      <section className="glass-card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Cpu size={20} />
          Inteligência Artificial
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

      {/* Sessão de Conexão */}
      <section className="glass-card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Wifi size={20} />
          Conexão
        </h2>

        <button
          onClick={handleTestConnection}
          className="btn btn-secondary"
          disabled={loading}
          style={{ width: "100%" }}
        >
          Testar Conexão com Supabase
        </button>
      </section>

      {/* Confirm Dialog */}
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

  return (
    <div className="settings-tab">
      {activeSubTab === 'main' ? renderMainScreen() : renderSubTab()}
    </div>
  );
}
