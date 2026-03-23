import { useState, useEffect } from "react";
import { Scan, History as HistoryIcon, Search, LogOut, Book } from "lucide-react";
import SearchTab from "./components/SearchTab";
import HistoryTab from "./components/HistoryTab";
import ScannerTab from "./components/ScannerTab";
import DictionaryTab from "./components/DictionaryTab";
import Login from "./components/Login";
import { Toaster, toast } from "react-hot-toast";
import { logout } from "./services/auth";
import { isSupabaseConfigured } from "./services/supabaseClient";
import { useApiKey } from "./hooks/useApiKey";
import { useReceipts } from "./hooks/useReceipts";
import { usePersistedTab } from "./hooks/usePersistedTab";
import { useReceiptScanner } from "./hooks/useReceiptScanner";
import { useSupabaseSession } from "./hooks/useSupabaseSession";
import ApiKeyModal from "./components/ApiKeyModal";
import "./index.css";

function App() {
  const { sessionUser, setSessionUser, authLoading } = useSupabaseSession();

  const { tab, setTab } = usePersistedTab();

  // Custom Hook para gestão de notas
  const {
    savedReceipts,
    setSavedReceipts,
    loading: receiptsLoading,
    error: receiptsError,
    loadReceipts,
    saveReceipt,
    deleteReceipt
  } = useReceipts(sessionUser);

  useEffect(() => {
    if (receiptsError) {
      toast.error("Erro ao sincronizar dados com o servidor. Exibindo dados locais.");
    }
  }, [receiptsError]);

  const {
    currentReceipt,
    setCurrentReceipt,
    loading: scanLoading,
    scanning,
    error: scanError,
    duplicateReceipt,
    setDuplicateReceipt,
    handleForceSaveDuplicate,
    startCamera,
    stopCamera,
    handleFileUpload,
    handleUrlSubmit,
    manualMode,
    setManualMode,
    manualData,
    setManualData,
    manualItem,
    setManualItem,
    handleSaveManualReceipt,
    zoom,
    zoomSupported,
    applyZoom,
  } = useReceiptScanner({ saveReceipt, tab });

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("recent");

  // History filter state
  const [historyFilter, setHistoryFilter] = useState("");

  // Advanced filters for HistoryTab
  const [historyFilters, setHistoryFilters] = useState({
    period: "all", // all, this-month, last-3-months, custom
    sortBy: "date", // date, value, store
    sortOrder: "desc", // asc, desc
    startDate: "", // for custom period
    endDate: "", // for custom period
  });
  const [expandedReceipts, setExpandedReceipts] = useState([]);

  // AI Key Management (BYOK)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const { apiKey, setApiKey, hasKey } = useApiKey();

  useEffect(() => {
    // Check if AI Key exists on startup
    if (!hasKey) {
      setShowApiKeyModal(true);
    }
  }, [hasKey]);

  const handleSaveApiKey = (newKey) => {
    setApiKey(newKey);
    setShowApiKeyModal(false);
  };

  const handleChangeTab = (nextTab) => setTab(nextTab);

  if (!isSupabaseConfigured) {
    return (
      <div className="app-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "1.5rem" }}>
        <div className="glass-card" style={{ maxWidth: "720px", width: "100%" }}>
          <h2 style={{ color: "#fff", marginBottom: "0.75rem" }}>Configuração necessária</h2>
          <p style={{ color: "#94a3b8", lineHeight: "1.6", marginBottom: "1rem" }}>
            Este deploy não tem o Supabase configurado. Para publicar no GitHub Pages, defina as variáveis
            <strong style={{ color: "#e2e8f0" }}> VITE_SUPABASE_URL</strong> e
            <strong style={{ color: "#e2e8f0" }}> VITE_SUPABASE_ANON_KEY</strong> como <strong style={{ color: "#e2e8f0" }}>Secrets</strong> do repositório.
          </p>
          <div style={{ color: "#94a3b8", lineHeight: "1.6" }}>
            <p style={{ marginBottom: "0.5rem" }}><strong style={{ color: "#e2e8f0" }}>Passo a passo:</strong></p>
            <ol style={{ paddingLeft: "1.25rem", margin: 0 }}>
              <li>GitHub → Settings → Secrets and variables → Actions → New repository secret</li>
              <li>Crie <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code></li>
              <li>Vá em Actions e aguarde o workflow “Deploy to GitHub Pages” rodar novamente</li>
              <li>Depois, limpe o cache do site (Application → Clear storage) se ainda ficar em branco</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <h2 style={{ color: '#fff' }}>Carregando...</h2>
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
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
             onClick={() => setShowApiKeyModal(true)}
             style={{
               background: 'rgba(59, 130, 246, 0.1)',
               border: 'none',
               color: 'var(--primary)',
               cursor: 'pointer',
               padding: '0.6rem',
               borderRadius: '10px',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center'
             }}
             title="Configurar IA"
          >
            <span style={{ fontSize: '1.2rem' }}>⚙️</span>
          </button>
          <button
             onClick={async () => {
               await logout();
               toast.success('Sessão encerrada.');
             }}
             style={{
               background: 'rgba(239, 68, 68, 0.1)',
               border: 'none',
               color: '#ef4444',
               cursor: 'pointer',
               padding: '0.6rem',
               borderRadius: '10px',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center'
             }}
             title="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main style={{ minHeight: "60vh" }}>
        {tab === "scan" && (
          <ScannerTab
            manualMode={manualMode}
            setManualMode={setManualMode}
            manualData={manualData}
            setManualData={setManualData}
            manualItem={manualItem}
            setManualItem={setManualItem}
            handleSaveManualReceipt={handleSaveManualReceipt}
            startCamera={startCamera}
            stopCamera={stopCamera}
            handleFileUpload={handleFileUpload}
            loading={scanLoading}
            scanning={scanning}
            error={scanError}
             currentReceipt={currentReceipt}
             handleUrlSubmit={handleUrlSubmit}
             setCurrentReceipt={setCurrentReceipt}
             zoom={zoom}
             zoomSupported={zoomSupported}
             applyZoom={applyZoom}
           />
        )}

        {tab === "history" && (
          <HistoryTab
            savedReceipts={savedReceipts}
            setSavedReceipts={setSavedReceipts}
            historyFilter={historyFilter}
            setHistoryFilter={setHistoryFilter}
            historyFilters={historyFilters}
            setHistoryFilters={setHistoryFilters}
            expandedReceipts={expandedReceipts}
            setExpandedReceipts={setExpandedReceipts}
            deleteReceipt={deleteReceipt}
            loading={receiptsLoading}
            loadReceipts={loadReceipts}
          />
        )}

        {tab === "search" && (
          <SearchTab
            savedReceipts={savedReceipts}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            loading={receiptsLoading}
          />
        )}

        {tab === "dictionary" && (
          <DictionaryTab setSavedReceipts={setSavedReceipts} loadReceipts={loadReceipts} />
        )}
      </main>

      {duplicateReceipt && (
        <div className="duplicate-modal-overlay" style={{ zIndex: 3000 }}>
          <div className="glass-card duplicate-modal-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "1.5rem",
              }}
            >
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
              <h2 style={{ color: "#fff", fontSize: "1.25rem" }}>
                Nota Já Existente
              </h2>
            </div>

            <p
              style={{
                color: "#94a3b8",
                fontSize: "0.95rem",
                marginBottom: "1.5rem",
                lineHeight: "1.6",
              }}
            >
              Esta nota fiscal já está no seu histórico desde{" "}
              <strong style={{ color: "#fbbf24" }}>
                {duplicateReceipt.date}
              </strong>
              .
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <button
                className="btn"
                onClick={() => setDuplicateReceipt(null)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--card-border)",
                }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-success"
                onClick={handleForceSaveDuplicate}
              >
                Atualizar Nota
              </button>
            </div>

            <p
              style={{
                color: "#64748b",
                fontSize: "0.8rem",
                marginTop: "1rem",
                textAlign: "center",
              }}
            >
              Isso substituirá a nota anterior
            </p>
          </div>
        </div>
      )}

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
          className={`nav-item ${tab === "dictionary" ? "active" : ""}`}
          onClick={() => handleChangeTab("dictionary")}
        >
          <Book size={22} />
          <span style={{ marginTop: "2px" }}>Dicionário</span>
        </button>
      </nav>

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        currentKey={apiKey}
        onSave={handleSaveApiKey}
      />
    </div>
  );
}

export default App;
