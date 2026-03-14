import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Scan, History as HistoryIcon, Search } from 'lucide-react';
import { parseNFCeSP } from './services/receiptParser';
import SearchTab from './components/SearchTab';
import HistoryTab from './components/HistoryTab';
import ScannerTab from './components/ScannerTab';
import './index.css';

function App() {
  const [tab, setTab] = useState('scan'); // 'scan', 'history', 'search'
  const [savedReceipts, setSavedReceipts] = useState([]);
  
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

  useEffect(() => {
    const storedTab = localStorage.getItem('@MyMercado:tab');
    if (storedTab) setTab(storedTab);

    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/receipts');
      const data = await res.json();
      if (Array.isArray(data.receipts)) {
        setSavedReceipts(data.receipts);
      }
    } catch {
      console.error('API Offline, using local storage');
      const stored = localStorage.getItem('@MyMercado:receipts');
      if (stored) setSavedReceipts(JSON.parse(stored));
    }
  };

  const handleChangeTab = (nextTab) => {
    setTab(nextTab);
    localStorage.setItem('@MyMercado:tab', nextTab);
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
    } catch {
      console.warn('Backup local apenas.');
    }
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
        setCurrentReceipt(extractedData);
        saveReceipt(extractedData);
      }
    } catch {
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
      handleScanSuccess(text);
    } catch {
      setError('QR Code não detectado na imagem.');
      setLoading(false);
    }
  };

  const handleSaveManualReceipt = async () => {
    if (manualData.items.length === 0) return;
    setLoading(true);
    const finalData = { ...manualData, establishment: manualData.establishment || 'Compra Manual' };
    
    saveReceipt(finalData);
    setManualMode(false);
    setManualData({ establishment: '', date: new Date().toLocaleDateString('pt-BR'), items: [] });
    setCurrentReceipt(finalData);
    setLoading(false);
  };

  const deleteReceipt = async (id) => {
    if (window.confirm("Certeza que deseja remover esta nota do histórico?")) {
      const newList = savedReceipts.filter(r => r.id !== id);
      setSavedReceipts(newList);
      localStorage.setItem('@MyMercado:receipts', JSON.stringify(newList));

      try {
        await fetch(`http://localhost:3001/api/receipts/${id}`, { method: 'DELETE' });
      } catch {
        // Ignore errors
      }
    }
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
      <header className="header">
        <div>
          <h1>My Mercado</h1>
          <p>Economize comparando preços e gerenciando compras.</p>
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
