import { Scan, Camera, Image as ImageIcon, Edit3, Loader, ShoppingCart, Save, Plus, X } from 'lucide-react';

function ScannerTab({ 
  manualMode, setManualMode, 
  manualData, setManualData, 
  manualItem, setManualItem, 
  handleSaveManualReceipt, 
  startCamera, handleFileUpload,
  loading, scanning, error, 
  currentReceipt, setCurrentReceipt
}) {
  
  const handleAddManualItem = () => {
    if (!manualItem.name || !manualItem.unitPrice) return;
    const priceNum = parseFloat(manualItem.unitPrice.replace(',', '.'));
    if (isNaN(priceNum)) return;
    const qtyNum = parseFloat(manualItem.qty) || 1;
    
    const totalNum = priceNum * qtyNum;
    const newItem = {
      name: manualItem.name,
      qty: manualItem.qty,
      unitPrice: priceNum.toFixed(2).replace('.', ','),
      total: totalNum.toFixed(2).replace('.', ',')
    };
    
    setManualData(prev => ({...prev, items: [newItem, ...prev.items]}));
    setManualItem({ name: '', qty: '1', unitPrice: '' });
  };

  if (manualMode) {
    return (
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem' }}>
          <h2 style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.4rem' }}>
            <Edit3 color="var(--primary)" size={24} /> 
            Cadastro Manual
          </h2>
          <button onClick={() => setManualMode(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
           <input type="text" className="search-input" placeholder="🛒 Nome do Mercado" value={manualData.establishment} onChange={e => setManualData({...manualData, establishment: e.target.value})} />
           <input type="text" className="search-input" placeholder="📅 Data (DD/MM/AAAA)" value={manualData.date} onChange={e => setManualData({...manualData, date: e.target.value})} />
        </div>

        <div style={{ background: 'rgba(15,23,42,0.4)', padding: '1.25rem', borderRadius: '1rem', marginBottom: '1.5rem', border: '1px solid var(--card-border)' }}>
           <h3 style={{ color: '#e2e8f0', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600 }}>ADICIONAR ITEM</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="text" className="search-input" style={{ background: 'var(--bg-color)' }} placeholder="Nome do Produto" value={manualItem.name} onChange={e => setManualItem({...manualItem, name: e.target.value})} />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input type="number" className="search-input" style={{ width: '85px', background: 'var(--bg-color)' }} placeholder="Qtd" value={manualItem.qty} onChange={e => setManualItem({...manualItem, qty: e.target.value})} />
                <input type="text" className="search-input" style={{ flex: 1, background: 'var(--bg-color)' }} placeholder="Valor (ex: 5,90)" value={manualItem.unitPrice} onChange={e => setManualItem({...manualItem, unitPrice: e.target.value})} />
                <button className="btn" style={{ padding: '0 1.25rem' }} onClick={handleAddManualItem}>
                  <Plus size={20} />
                </button>
              </div>
           </div>
        </div>

        {manualData.items.length > 0 && (
          <div className="items-list" style={{ marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
             {manualData.items.map((it, idx) => (
                <div key={idx} className="item-row" style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)' }}>
                  <div className="item-details">
                    <span className="item-name" style={{ fontSize: '0.95rem' }}>{it.name}</span>
                    <span className="item-meta">{it.qty} x R$ {it.unitPrice}</span>
                  </div>
                  <div className="item-total" style={{ fontSize: '1.1rem' }}>R$ {it.total}</div>
                </div>
             ))}
          </div>
        )}

        <button className="btn btn-success" style={{ width: '100%', padding: '1.1rem', fontSize: '1.1rem' }} onClick={handleSaveManualReceipt} disabled={manualData.items.length === 0}>
           <Save size={20} />
           Finalizar e Salvar
        </button>
      </div>
    );
  }

  return (
    <>
      {!loading && !currentReceipt && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="pulse-container" style={{ margin: '0 auto', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%' }}>
              <Scan size={50} color="var(--primary)" />
            </div>
            <h2 style={{ marginTop: '1.5rem', color: '#f8fafc', fontSize: '1.6rem' }}>Escanear Nota Fiscal</h2>
            <p style={{ marginTop: '0.75rem', color: '#94a3b8', lineHeight: '1.6' }}>
              Aponte a câmera para o QR Code da nota fiscal e registre seus gastos automaticamente.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <button className="btn" style={{ height: '60px' }} onClick={startCamera} disabled={loading || scanning}>
              <Camera size={20} />
              Câmera
            </button>
            <label className="btn btn-success" style={{ height: '60px', opacity: loading || scanning ? 0.7 : 1, cursor: 'pointer' }}>
              <ImageIcon size={20} />
              Galeria
              <input type="file" accept="image/*" onChange={handleFileUpload} disabled={loading || scanning} style={{ display: 'none' }} />
            </label>
          </div>

          <button
            className="btn"
            style={{ backgroundColor: 'transparent', border: '1px solid var(--card-border)', color: '#94a3b8', width: '100%', height: '50px' }}
            onClick={() => setManualMode(true)}
            disabled={loading || scanning}
          >
            <Edit3 size={18} />
            Digitar Conteúdo Manualmente
          </button>

          {error && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.75rem', color: '#f87171', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}
        </div>
      )}

      <div id="reader" className="scanner-container" style={{ display: scanning ? 'block' : 'none', minHeight: '300px', background: '#000', borderRadius: '1rem' }}></div>

      {loading && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Loader size={48} className="spin" color="var(--primary)" style={{ margin: '0 auto' }} />
          <h3 style={{ marginTop: '2rem', color: '#e2e8f0' }}>
            Processando Nota...
          </h3>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
            Estamos extraindo os dados da Sefaz para o seu histórico.
          </p>
        </div>
      )}

      {currentReceipt && (
        <div className="glass-card">
           <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
             <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <ShoppingCart color="white" size={30} />
             </div>
             <h2 style={{ color: '#fff' }}>Nota Salva!</h2>
             <p style={{ color: 'var(--success)', fontWeight: 600, fontSize: '1.1rem' }}>{currentReceipt.establishment}</p>
             <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{currentReceipt.date}</p>
           </div>
           
           <div className="items-list" style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '1.5rem' }}>
             {currentReceipt.items.map((item, idx) => (
               <div key={idx} className="item-row" style={{ background: 'rgba(255,255,255,0.02)' }}>
                 <div className="item-details">
                   <span className="item-name" style={{ fontSize: '0.9rem' }}>{item.name}</span>
                   <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                     <span className="item-meta">R$ {item.unitPrice} un x {item.qty}</span>
                   </div>
                 </div>
                 <div className="item-total" style={{ fontSize: '1rem' }}>R$ {item.total}</div>
               </div>
             ))}
           </div>

           <div className="total-summary" style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>
             <span style={{ color: '#94a3b8', fontWeight: 500 }}>Total</span>
             <span style={{ color: 'var(--success)' }}>
               R$ {currentReceipt.items.reduce((acc, curr) => acc + parseFloat(curr.total.replace(',', '.')), 0).toFixed(2).replace('.', ',')}
             </span>
           </div>

           <button className="btn btn-success" style={{ width: '100%', padding: '1rem' }} onClick={() => setCurrentReceipt(null)}>
             <Plus size={20} />
             Registrar Nova Nota
           </button>
        </div>
      )}
    </>
  );
}

export default ScannerTab;
