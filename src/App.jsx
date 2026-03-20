import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Scan, History as HistoryIcon, Search, LogOut } from "lucide-react";
import { parseNFCeSP } from "./services/receiptParser";
import SearchTab from "./components/SearchTab";
import HistoryTab from "./components/HistoryTab";
import ScannerTab from "./components/ScannerTab";
import Login from "./components/Login";
import { Toaster, toast } from "react-hot-toast";
import { getAllReceiptsFromDB, insertReceiptToDB, deleteReceiptFromDB } from "./services/dbMethods";
import { logout } from "./services/auth";
import { supabase } from "./services/supabaseClient";
import "./index.css";

function App() {
  const [sessionUser, setSessionUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [tab, setTab] = useState("scan"); // 'scan', 'history', 'search'
  const [savedReceipts, setSavedReceipts] = useState([]);

  // Scan & Global State
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [duplicateReceipt, setDuplicateReceipt] = useState(null);
  const qrCodeRef = useRef(null);

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

  // Loading states para skeletons
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

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

  useEffect(() => {
    const storedTab = localStorage.getItem("@MyMercado:tab");
    if (storedTab) setTab(storedTab);

    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
      if (session?.user) {
        loadReceipts();
      }
      setAuthLoading(false);
    });

    // Listen to changes (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
      if (session?.user) {
        loadReceipts();
      } else {
        setSavedReceipts([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadReceipts = async () => {
    setHistoryLoading(true);
    setSearchLoading(true);
    try {
      const data = await getAllReceiptsFromDB();
      if (Array.isArray(data)) {
        setSavedReceipts(data);
        localStorage.setItem("@MyMercado:receipts", JSON.stringify(data));
      }
    } catch (err) {
      console.error("Supabase offline ou erro. Usando localStorage:", err);
      try {
        const stored = localStorage.getItem("@MyMercado:receipts");
        if (stored) setSavedReceipts(JSON.parse(stored));
      } catch (parseErr) {
        console.error("Erro ao ler localStorage:", parseErr);
      }
    } finally {
      setHistoryLoading(false);
      setSearchLoading(false);
    }
  };

  const handleChangeTab = (nextTab) => {
    setTab(nextTab);
    localStorage.setItem("@MyMercado:tab", nextTab);
  };

  const saveReceipt = async (receipt, forceReplace = false) => {
    // Check for duplicates
    const existingReceipt = savedReceipts.find((r) => r.id === receipt.id);
    if (existingReceipt && !forceReplace) {
      setDuplicateReceipt(receipt);
      toast.warning(
        `Esta nota já está no seu histórico desde ${existingReceipt.date.split(" ")[0]}`,
      );
      return false;
    }

    const newReceipt = { id: receipt.id || Date.now().toString(), ...receipt };
    // Filtrar o antigo antes de adicionar o novo (evita duplicatas ao forçar substituição)
    const filteredList = savedReceipts.filter((r) => r.id !== newReceipt.id);
    const newList = [newReceipt, ...filteredList];
    setSavedReceipts(newList);
    localStorage.setItem("@MyMercado:receipts", JSON.stringify(newList));

    try {
      await insertReceiptToDB(newReceipt);
      setDuplicateReceipt(null);
      setError(null);
      return true;
    } catch (err) {
      console.warn("Erro ao salvar no Supabase, backup local:", err);
      setDuplicateReceipt(null);
      return true;
    }
  };

  const handleScanSuccess = async (decodedText) => {
    setScanning(false);
    setLoading(true);
    try {
      setError(null);
      const extractedData = await parseNFCeSP(decodedText);
      if (
        !extractedData ||
        !extractedData.items ||
        extractedData.items.length === 0
      ) {
        toast.error(
          "Não conseguimos ler os itens dessa nota. Verifique se o QR Code é de uma NFC-e válida.",
        );
        setError("Falha ao extrair itens da nota.");
      } else {
        const saved = await saveReceipt(extractedData);
        if (saved) {
          setCurrentReceipt(extractedData);
          toast.success("Nota fiscal salva com sucesso!");
        }
      }
    } catch (err) {
      toast.error("Erro ao processar nota. Tente novamente.");
      setError(
        "Erro de conexão ou processamento: " + (err.message || "Desconhecido"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForceSaveDuplicate = () => {
    if (duplicateReceipt) {
      saveReceipt(duplicateReceipt, true);
      setCurrentReceipt(duplicateReceipt);
      toast.success("Nota atualizada com sucesso!");
    }
  };

  const stopCamera = async () => {
    if (qrCodeRef.current) {
      try {
        await qrCodeRef.current.stop();
      } catch (err) {
        console.warn("Erro ao parar câmera:", err);
      } finally {
        qrCodeRef.current = null;
        setScanning(false);
      }
    }
  };

  const startCamera = async () => {
    if (scanning || loading) return;
    setScanning(true);
    setTimeout(() => {
      try {
        const scanner = new Html5Qrcode("reader");
        qrCodeRef.current = scanner;
        scanner
          .start(
            { facingMode: "environment" },
            { fps: 12, qrbox: { width: 250, height: 250 } },
            (text) => {
              stopCamera();
              handleScanSuccess(text);
            },
            () => {},
          )
          .catch(() => {
            setScanning(false);
            toast.error("Câmera não disponível. Verifique as permissões ou se o site usa HTTPS.");
          });
      } catch {
        setScanning(false);
      }
    }, 150);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const scanner = new Html5Qrcode("reader");
      const text = await scanner.scanFile(file, true);
      await handleScanSuccess(text);
    } catch {
      toast.error("QR Code não detectado na imagem.");
      setLoading(false);
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

    // Manual IDs must be URL-safe (no `/`) and unique to avoid collisions and broken DELETE routes.
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
      const saved = await saveReceipt(finalData);
      if (saved) {
        setManualMode(false);
        setManualData({
          establishment: "",
          date: new Date().toLocaleDateString("pt-BR"),
          items: [],
        });
        setCurrentReceipt(finalData);
        toast.success("Nota manual salva com sucesso!");
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteReceipt = async (id) => {
    if (window.confirm("Certeza que deseja remover esta nota do histórico?")) {
      const newList = savedReceipts.filter((r) => r.id !== id);
      setSavedReceipts(newList);
      localStorage.setItem("@MyMercado:receipts", JSON.stringify(newList));

      try {
        await deleteReceiptFromDB(id);
        toast.success("Nota removida com sucesso!");
      } catch {
        toast.error("Erro ao remover nota no banco remoto.");
      }
    }
  };

  useEffect(() => {
    if (tab !== "scan" && qrCodeRef.current) {
      qrCodeRef.current
        .stop()
        .catch(() => {})
        .finally(() => {
          qrCodeRef.current = null;
          setScanning(false);
        });
    }
  }, [tab]);

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
        <div>
          <h1>My Mercado</h1>
          <p>Economize comparando preços e gerenciando compras.</p>
        </div>
        <button
           onClick={async () => {
             await logout();
             toast.success('Sessão encerrada.');
           }}
           style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }}
           title="Sair"
        >
          <LogOut size={24} />
        </button>
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
            setCurrentReceipt={setCurrentReceipt}
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
            loading={historyLoading}
          />
        )}

        {tab === "search" && (
          <SearchTab
            savedReceipts={savedReceipts}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            loading={searchLoading}
          />
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
      </nav>
    </div>
  );
}

export default App;
