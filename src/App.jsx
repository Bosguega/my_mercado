import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Scan, History as HistoryIcon, Search } from 'lucide-react';
import { parseNFCeSP } from './services/receiptParser';
import SearchTab from './components/SearchTab';
import HistoryTab from './components/HistoryTab';
import ScannerTab from './components/ScannerTab';
import { Cpu, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import './index.css';

function App() {
  const [tab, setTab] = useState('scan'); // 'scan', 'history', 'search'
  const [savedReceipts, setSavedReceipts] = useState([]);
  const [llmStatus, setLlmStatus] = useState('off'); // 'on', 'off', 'loading'
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  // Scan & Global State
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const qrCodeRef = useRef(null);

  // Manual Mode State
  const [manualMode, setManualMode] = useState(false);
  const [manualData, setManualData] = useState({ establishment: '', date: new Date().toLocaleDateString('pt-BR'), items: [] });
  const [manualItem, setManualItem] = useState({ name: '', qty: '1', unitPrice: '' });

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('recent'); 

  // History filter state
  const [historyFilter, setHistoryFilter] = useState('');
  const [expandedReceipts, setExpandedReceipts] = useState([]);

  // LLM State
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isSwitchingModel, setIsSwitchingModel] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);

  useEffect(() => {
    const storedTab = localStorage.getItem('@MyMercado:tab');
    if (storedTab) setTab(storedTab);

    loadReceipts();
    checkLLMStatus();
    fetchModels();
  }, []);

  const checkLLMStatus = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/status');
      const data = await res.json();
      setLlmStatus(data.llmStatus);
      setSelectedModel(data.currentModel || '');
      
      // Se estiver off, mostra o seletor ao iniciar
      if (data.llmStatus === 'off') {
        setShowModelSelector(true);
      }
    } catch (e) {
      setLlmStatus('off');
    }
  };

  const loadReceipts = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/receipts');
      const data = await res.json();
      if (Array.isArray(data.receipts)) {
        setSavedReceipts(data.receipts);
      }
    } catch (e) {
      console.error('API Offline, using local storage');
      const stored = localStorage.getItem('@MyMercado:receipts');
      if (stored) setSavedReceipts(JSON.parse(stored));
    }
  };

  const fetchModels = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/models');
      const data = await res.json();
      if (data.models) {
        setAvailableModels(data.models);
        setSelectedModel(data.currentModel || '');
      }
    } catch (err) {
      console.error('Erro ao buscar modelos:', err);
    }
  };

  const handleChangeTab = (nextTab) => {
    setTab(nextTab);
    localStorage.setItem('@MyMercado:tab', nextTab);
  };

  const handleModelChange = async (newModel) => {
    setIsSwitchingModel(true);
    setLlmStatus('loading');
    try {
      const res = await fetch('http://localhost:3001/api/models/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: newModel })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedModel(newModel);
        setLlmStatus('on');
        setShowModelSelector(false);
      }
    } catch (err) {
      alert('Falha ao trocar o modelo no servidor.');
      setLlmStatus('off');
    } finally {
      setIsSwitchingModel(false);
    }
  };

  const saveReceipt = async (receipt) => {
    const newReceipt = { id: Date.now().toString(), ...receipt };
    const newList = [newReceipt, ...savedReceipts];
    setSavedReceipts(newList);
    localStorage.setItem('@MyMercado:receipts', JSON.stringify(newList));

    try {
      await fetch('http://localhost:3001/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReceipt),
      });
    } catch (e) {
      console.warn('Backup local apenas.');
    }
  };

  const deleteReceipt = async (id) => {
    if (window.confirm("Certeza que deseja remover esta nota do histórico?")) {
      const newList = savedReceipts.filter(r => r.id !== id);
      setSavedReceipts(newList);
      localStorage.setItem('@MyMercado:receipts', JSON.stringify(newList));

      try {
        await fetch(`http://localhost:3001/api/receipts/${id}`, { method: 'DELETE' });
      } catch (e) {}
    }
  };

  const categorizeReceipt = async (receipt) => {
    if (llmStatus !== 'on') return receipt;
    
    setIsCategorizing(true);
    try {
      const res = await fetch('http://localhost:3001/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: receipt.items })
      });
      const data = await res.json();
      if (data.items) {
        return { ...receipt, items: data.items };
      }
    } catch (e) {
      console.warn('Falha na categorização:', e);
    } finally {
      setIsCategorizing(false);
    }
    return receipt;
  };

  const handleScanSuccess = async (decodedText) => {
    setScanning(false);
    setLoading(true);
    setError('');
    try {
      const extractedData = await parseNFCeSP(decodedText);
      if (!extractedData || !extractedData.items || extractedData.items.length === 0) {
        setError('Não conseguimos ler os itens dessa nota. Verifique se o QR Code é de uma NFC-e válida.');
      } else {
        const categorizedData = await categorizeReceipt(extractedData);
        setCurrentReceipt(categorizedData);
        saveReceipt(categorizedData);
      }
    } catch (err) {
      setError('Erro de processamento. Tente novamente ou insira manualmente.');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    if (scanning || loading) return;
    setError('');
    setScanning(true);
    setTimeout(() => {
      try {
        const scanner = new Html5Qrcode("reader");
        qrCodeRef.current = scanner;
        scanner.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: { width: 250, height: 250 } },
          (text) => {
             scanner.stop().then(() => { qrCodeRef.current = null; }).catch(() => {});
             handleScanSuccess(text);
          },
          () => {}
        ).catch(() => {
          setScanning(false);
          setError('Câmera bloqueada ou indisponível.');
        });
      } catch (err) {
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
      handleScanSuccess(text);
    } catch (err) {
      setError('QR Code não detectado na imagem.');
      setLoading(false);
    }
  };

  const handleSaveManualReceipt = async () => {
    if (manualData.items.length === 0) return;
    setLoading(true);
    const finalData = { ...manualData, establishment: manualData.establishment || 'Compra Manual' };
    
    const categorizedData = await categorizeReceipt(finalData);
    
    saveReceipt(categorizedData);
    setManualMode(false);
    setManualData({ establishment: '', date: new Date().toLocaleDateString('pt-BR'), items: [] });
    setCurrentReceipt(categorizedData);
    setLoading(false);
  };

  useEffect(() => {
    if (tab !== 'scan' && qrCodeRef.current) {
      qrCodeRef.current.stop().catch(() => {}).finally(() => {
        qrCodeRef.current = null;
        setScanning(false);
      });
    }
  }, [tab]);

  return (
    <div className="app-container">
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>My Mercado</h1>
          <p>Economize comparando preços e gerenciando compras.</p>
        </div>
        
        <div 
          className={`llm-status-pill ${llmStatus}`} 
          onClick={() => setShowModelSelector(true)}
          title="Configurar LLM Local (llama.cpp)"
        >
          {llmStatus === 'loading' ? <Loader2 size={14} className="spin" /> : <Cpu size={14} />}
          <span>{llmStatus === 'on' ? (selectedModel.replace('.gguf', '') || 'LLM') : 'LLM Off'}</span>
        </div>
      </header>

      <main style={{ minHeight: '60vh' }}>
        {tab === 'scan' && (
          <ScannerTab 
            manualMode={manualMode} setManualMode={setManualMode}
            manualData={manualData} setManualData={setManualData}
            manualItem={manualItem} setManualItem={setManualItem}
            handleSaveManualReceipt={handleSaveManualReceipt}
            startCamera={startCamera} handleFileUpload={handleFileUpload}
            loading={loading} scanning={scanning} error={error}
            currentReceipt={currentReceipt} setCurrentReceipt={setCurrentReceipt}
            isCategorizing={isCategorizing}
          />
        )}
        
        {tab === 'history' && (
          <HistoryTab 
            savedReceipts={savedReceipts}
            historyFilter={historyFilter} setHistoryFilter={setHistoryFilter}
            expandedReceipts={expandedReceipts} setExpandedReceipts={setExpandedReceipts}
            deleteReceipt={deleteReceipt}
          />
        )}

        {tab === 'search' && (
          <SearchTab
            savedReceipts={savedReceipts}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            sortOrder={sortOrder} setSortOrder={setSortOrder}
          />
        )}

        {showModelSelector && (
          <div className="model-selector-overlay">
            <div className="glass-card model-selector-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>Configurar LLM Local</h2>
                <button 
                  onClick={() => setShowModelSelector(false)} 
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                O servidor llama.cpp está disponível. Escolha um modelo para carregar na memória.
              </p>

              <div className="models-list">
                {availableModels.length > 0 ? (
                  availableModels.map(model => (
                    <button 
                      key={model} 
                      className={`model-item ${selectedModel === model ? 'active' : ''}`}
                      onClick={() => handleModelChange(model)}
                      disabled={isSwitchingModel}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Cpu size={18} opacity={0.7} />
                        <span style={{ textAlign: 'left' }}>{model}</span>
                      </div>
                      {selectedModel === model && llmStatus === 'on' && <CheckCircle size={16} color="var(--success)" />}
                    </button>
                  ))
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                    <AlertCircle size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <p>Nenhum modelo .gguf encontrado na pasta configurada.</p>
                  </div>
                )}
              </div>

              {isSwitchingModel && (
                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)' }}>
                  <Loader2 size={18} className="spin" />
                  <span style={{ fontSize: '0.9rem' }}>Carregando modelo... Isso pode levar alguns segundos.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button className={`nav-item ${tab === 'scan' ? 'active' : ''}`} onClick={() => handleChangeTab('scan')}>
           <Scan size={22} /><span style={{ marginTop: '2px' }}>Escanear</span>
        </button>
        <button className={`nav-item ${tab === 'history' ? 'active' : ''}`} onClick={() => handleChangeTab('history')}>
           <HistoryIcon size={22} /><span style={{ marginTop: '2px' }}>Histórico</span>
        </button>
        <button className={`nav-item ${tab === 'search' ? 'active' : ''}`} onClick={() => handleChangeTab('search')}>
           <Search size={22} /><span style={{ marginTop: '2px' }}>Preços</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
