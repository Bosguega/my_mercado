import { useState, useEffect, lazy, Suspense } from "react";
import { Scan, History as HistoryIcon, Search, LogOut, Package } from "lucide-react";
import Login from "./components/Login";
import { Toaster, toast } from "react-hot-toast";
import { logout } from "./services/auth";
import { isSupabaseConfigured } from "./services/supabaseClient";
import { useApiKey } from "./hooks/useApiKey";
import { useSupabaseSession } from "./hooks/useSupabaseSession";
import ApiKeyModal from "./components/ApiKeyModal";
import { PerformancePanel } from "./components/PerformancePanel";
import type { AppTab } from "./types/ui";
import { useReceiptsStore } from "./stores/useReceiptsStore";
import { useScannerStore } from "./stores/useScannerStore";
import { useUiStore } from "./stores/useUiStore";
import { useAllReceiptsQuery } from "./hooks/queries/useReceiptsQuery";
import "./index.css";

// Lazy loading das abas para melhor performance
const ScannerTab = lazy(() => import("./components/ScannerTab"));
const HistoryTab = lazy(() => import("./components/HistoryTab"));
const SearchTab = lazy(() => import("./components/SearchTab"));
// const DictionaryTab = lazy(() => import("./components/DictionaryTab"));
const CanonicalProductsTab = lazy(() => import("./components/CanonicalProductsTab"));

// Componente de loading para Suspense
const TabSkeleton = () => (
  <div className="glass-card" style={{ padding: "2rem", textAlign: "center" }}>
    <div className="skeleton-line" style={{ width: "60%", height: "20px", margin: "0 auto 1rem" }} />
    <div className="skeleton-line" style={{ width: "80%", height: "16px", margin: "0 auto" }} />
  </div>
);

function App() {
  const { sessionUser, setSessionUser, authLoading } = useSupabaseSession();

  const setSessionUserId = useReceiptsStore((state) => state.setSessionUserId);
  const setError = useReceiptsStore((state) => state.setError);
  const resetScannerState = useScannerStore((state) => state.resetScannerState);

  const tab = useUiStore((state) => state.tab);
  const setTab = useUiStore((state) => state.setTab);

  // React Query para carregar receipts quando usuário logar
  const { error: receiptsError } = useAllReceiptsQuery(!!sessionUser);

  useEffect(() => {
    setSessionUserId(sessionUser?.id ?? null);
    if (!sessionUser) {
      resetScannerState();
    }
  }, [resetScannerState, sessionUser, setSessionUserId]);

  useEffect(() => {
    if (receiptsError) {
      setError(receiptsError);
      toast.error("Erro ao sincronizar dados com o servidor. Exibindo dados locais.");
    } else {
      setError(null);
    }
  }, [receiptsError, setError]);

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const { apiKey, setApiKey, hasKey } = useApiKey();

  useEffect(() => {
    if (!hasKey) {
      setShowApiKeyModal(true);
    }
  }, [hasKey]);

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    setShowApiKeyModal(false);
  };

  const handleChangeTab = (nextTab: AppTab) => setTab(nextTab);

  if (!isSupabaseConfigured) {
    return (
      <div className="app-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "1.5rem" }}>
        <div className="glass-card" style={{ maxWidth: "720px", width: "100%" }}>
          <h2 style={{ color: "#fff", marginBottom: "0.75rem" }}>Configuração necessária</h2>
          <p style={{ color: "#94a3b8", lineHeight: "1.6", marginBottom: "1rem" }}>
            Este deploy não tem o Supabase configurado. Para publicar no GitHub Pages, defina as variáveis
            <strong style={{ color: "#e2e8f0" }}> VITE_SUPABASE_URL</strong> e
            <strong style={{ color: "#e2e8f0" }}> VITE_SUPABASE_ANON_KEY</strong> como <strong style={{ color: "#e2e8f0" }}>secrets</strong> do repositório.
          </p>
          <div style={{ color: "#94a3b8", lineHeight: "1.6" }}>
            <p style={{ marginBottom: "0.5rem" }}><strong style={{ color: "#e2e8f0" }}>Passo a passo:</strong></p>
            <ol style={{ paddingLeft: "1.25rem", margin: 0 }}>
              <li>GitHub → Settings → Secrets and variables → Actions → New repository secret</li>
              <li>Crie <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code></li>
              <li>Vá em Actions e aguarde o workflow &quot;Deploy to GitHub Pages&quot; rodar novamente</li>
              <li>Depois, limpe o cache do site (Application → Clear storage) se ainda ficar em branco</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="app-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <h2 style={{ color: "#fff" }}>Carregando...</h2>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <>
        <Login setSessionUser={setSessionUser} />
        <Toaster position="top-center" toastOptions={{ style: { background: "rgba(15, 23, 42, 0.95)", color: "#fff", borderRadius: "12px" } }} />
      </>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div style={{ flex: 1 }}>
          <h1>My Mercado</h1>
          <p>Economize comparando preços.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            onClick={() => setShowApiKeyModal(true)}
            style={{
              background: "rgba(59, 130, 246, 0.1)",
              border: "none",
              color: "var(--primary)",
              cursor: "pointer",
              padding: "0.6rem",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Configurar IA"
          >
            <span style={{ fontSize: "1.2rem" }}>⚙️</span>
          </button>
          <button
            onClick={async () => {
              resetScannerState();
              await logout();
              toast.success("Sessão encerrada.");
            }}
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "none",
              color: "#ef4444",
              cursor: "pointer",
              padding: "0.6rem",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main style={{ minHeight: "60vh" }}>
        <Suspense fallback={<TabSkeleton />}>
          {tab === "scan" && <ScannerTab />}
          {tab === "history" && <HistoryTab />}
          {tab === "search" && <SearchTab />}
          {tab === "products" && <CanonicalProductsTab />}
        </Suspense>
      </main>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: "rgba(15, 23, 42, 0.95)",
            color: "#fff",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(8px)",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />

      <nav className="bottom-nav">
        <button
          className={`nav-item ${tab === "scan" ? "active" : ""}`}
          onClick={() => handleChangeTab("scan")}
        >
          <Scan size={22} />
          <span style={{ marginTop: "2px" }}>Escanear</span>
        </button>
        <button
          className={`nav-item ${tab === "history" ? "active" : ""}`}
          onClick={() => handleChangeTab("history")}
        >
          <HistoryIcon size={22} />
          <span style={{ marginTop: "2px" }}>Histórico</span>
        </button>
        <button
          className={`nav-item ${tab === "search" ? "active" : ""}`}
          onClick={() => handleChangeTab("search")}
        >
          <Search size={22} />
          <span style={{ marginTop: "2px" }}>Preços</span>
        </button>

        <button
          className={`nav-item ${tab === "products" ? "active" : ""}`}
          onClick={() => handleChangeTab("products")}
        >
          <Package size={22} />
          <span style={{ marginTop: "2px" }}>Produtos</span>
        </button>
      </nav>

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        currentKey={apiKey ?? undefined}
        onSave={handleSaveApiKey}
      />

      {/* Performance Panel - apenas em desenvolvimento */}
      <PerformancePanel />
    </div>
  );
}

export default App;
