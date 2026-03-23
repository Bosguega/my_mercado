import { useState, useEffect, useRef } from "react";
import { BrowserMultiFormatReader, DecodeHintType } from "@zxing/library";
import { Scan, History as HistoryIcon, Search, LogOut, Book } from "lucide-react";
import { parseNFCeSP } from "./services/receiptParser";
import SearchTab from "./components/SearchTab";
import HistoryTab from "./components/HistoryTab";
import ScannerTab from "./components/ScannerTab";
import DictionaryTab from "./components/DictionaryTab";
import Login from "./components/Login";
import { Toaster, toast } from "react-hot-toast";
import { logout } from "./services/auth";
import { isSupabaseConfigured, supabase } from "./services/supabaseClient";
import { useApiKey } from "./hooks/useApiKey";
import { useReceipts } from "./hooks/useReceipts";
import ApiKeyModal from "./components/ApiKeyModal";
import "./index.css";

function App() {
  const [sessionUser, setSessionUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [tab, setTab] = useState("scan"); // 'scan', 'history', 'search'
  
  // Custom Hook para gestão de notas
  const { 
    savedReceipts, 
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

  // Scan & Global State
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [duplicateReceipt, setDuplicateReceipt] = useState(null);
  const codeReaderRef = useRef(null);

  // Manual Mode State
  const [manualMode, setManualMode] = useState(false);
  const [manualData, setManualData] = useState({
    establishment: "",
    date: new Date().toLocaleDateString("pt-BR"),
    items: [],
  });
  const [manualItem, setManualItem] = useState({
    name: "",
    qty: "1",
    unitPrice: "",
  });

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

  useEffect(() => {
    const storedTab = localStorage.getItem("@MyMercado:tab");
    if (storedTab) setTab(storedTab);

    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen to changes (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleChangeTab = (nextTab) => {
    setTab(nextTab);
    localStorage.setItem("@MyMercado:tab", nextTab);
  };

  const handleScanSuccess = async (decodedText) => {
    setScanning(false);
    setLoading(true);
    try {
      setError(null);
      const extractedData = await parseNFCeSP(decodedText);
      
      if (!extractedData || !extractedData.items || extractedData.items.length === 0) {
        toast.error("Não conseguimos ler os itens dessa nota. Verifique se o QR Code é de uma NFC-e válida.");
        setError("Falha ao extrair itens da nota.");
        return;
      }

      const result = await saveReceipt(extractedData);
      
      if (result.duplicate) {
        setDuplicateReceipt(extractedData);
        toast(
          `Esta nota já está no seu histórico desde ${result.existingReceipt.date.split(" ")[0]}`,
          { icon: "⚠️" },
        );
      } else if (result.success) {
        setCurrentReceipt(result.receipt);
        toast.success("Nota fiscal processada com sucesso!");
      }
    } catch (err) {
      toast.error("Erro ao processar nota. Tente novamente.");
      setError("Erro de conexão ou processamento: " + (err.message || "Desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const handleForceSaveDuplicate = async () => {
    if (duplicateReceipt) {
      const result = await saveReceipt(duplicateReceipt, true);
      if (result.success) {
        setCurrentReceipt(result.receipt);
        setDuplicateReceipt(null);
        toast.success("Nota atualizada com sucesso!");
      }
    }
  };

  const stopCamera = async () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (err) {
        console.warn("Erro ao parar câmera:", err);
      } finally {
        codeReaderRef.current = null;
        setScanning(false);
      }
    }
  };

  const startCamera = async () => {
    if (scanning || loading) return;
    setScanning(true);
    
    setTimeout(async () => {
      try {
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);

        const codeReader = new BrowserMultiFormatReader(hints);
        codeReaderRef.current = codeReader;

        const constraints = {
          audio: false,
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        };

        await codeReader.decodeFromConstraints(constraints, "reader-video", (result) => {
          if (result) {
            const text = result.getText();
            stopCamera();
            handleScanSuccess(text);
          }
        });
      } catch (err) {
        setScanning(false);
        toast.error("Câmera não disponível. Verifique as permissões ou se o site usa HTTPS.");
        console.error("Camera fail:", err);
      }
    }, 150);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    let imageUrl = null;
    try {
      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      const codeReader = new BrowserMultiFormatReader(hints);

      imageUrl = URL.createObjectURL(file);
      const result = await codeReader.decodeFromImageUrl(imageUrl);
      
      if (result) {
        await handleScanSuccess(result.getText());
      } else {
        throw new Error("Não detectado");
      }
    } catch {
      toast.error("QR Code não detectado na imagem.");
      setLoading(false);
    } finally {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    }
  };

  const handleSaveManualReceipt = async () => {
    if (manualData.items.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }
    if (!manualData.establishment?.trim()) {
      toast.error("Informe o nome do mercado");
      return;
    }

    // Validar data
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(manualData.date)) {
      toast.error("Data inválida! Use DD/MM/AAAA");
      return;
    }

    // Validar itens (preços e quantidades)
    const hasInvalidItems = manualData.items.some((item) => {
      const price = parseFloat(
        (item.unitPrice || "").toString().replace(",", "."),
      );
      const qty = parseFloat((item.qty || "").toString().replace(",", "."));
      return isNaN(price) || isNaN(qty) || price < 0 || qty < 0;
    });

    if (hasInvalidItems) {
      toast.error(
        "Existem itens com valores inválidos. Verifique os preços e quantidades.",
      );
      return;
    }

    const toStoreSlug = (value) => {
      const base = (value || "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
      return base || "mercado";
    };

    const normalizeManualDate = (value) => {
      const match = (value || "").toString().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!match) return "data";
      const [, dd, mm, yyyy] = match;
      return `${yyyy}${mm}${dd}`;
    };

    const randomSuffix =
      (globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}_${Math.random().toString(16).slice(2)}`).replace(/-/g, "");
    const manualId = `manual_${normalizeManualDate(manualData.date)}_${toStoreSlug(manualData.establishment)}_${randomSuffix.slice(0, 12)}`;
    const finalData = {
      ...manualData,
      id: manualId,
      establishment: manualData.establishment.trim() || "Compra Manual",
    };

    setLoading(true);
    try {
      const result = await saveReceipt(finalData);
      if (result.success) {
        setCurrentReceipt(result.receipt);

        setManualMode(false);
        setManualData({
          establishment: "",
          date: new Date().toLocaleDateString("pt-BR"),
          items: [],
        });
        toast.success("Nota manual salva com sucesso!");
      }
    } catch (err) {
      toast.error("Erro ao salvar nota.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "scan" && codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch {
        // ignore
      }
      codeReaderRef.current = null;
      setScanning(false);
    }
  }, [tab]);

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
            loading={loading}
            scanning={scanning}
            error={error}
            currentReceipt={currentReceipt}
            handleUrlSubmit={handleScanSuccess}
            setCurrentReceipt={setCurrentReceipt}
          />
        )}

        {tab === "history" && (
          <HistoryTab
            savedReceipts={savedReceipts}
            setSavedReceipts={loadReceipts}
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
          <DictionaryTab />
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
