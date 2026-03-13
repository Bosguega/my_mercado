import { History, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

function HistoryTab({ savedReceipts, historyFilter, setHistoryFilter, expandedReceipts, setExpandedReceipts, deleteReceipt }) {
  if (savedReceipts.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
         <div style={{ position: 'relative', display: 'inline-block' }}>
           <History size={64} color="var(--primary)" style={{ opacity: 0.2 }} />
           <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
             <History size={32} color="var(--primary)" />
           </div>
         </div>
         <h2 style={{ marginTop: '1.5rem', color: '#e2e8f0' }}>Histórico Vazio</h2>
         <p style={{ color: '#94a3b8', marginTop: '0.5rem', maxWidth: '300px', margin: '0.5rem auto' }}>
           Suas notas fiscais escaneadas aparecerão aqui para você acompanhar preços e economizar.
         </p>
      </div>
    );
  }

  const filteredReceipts = historyFilter.trim()
    ? savedReceipts.filter((receipt) =>
        receipt.establishment?.toLowerCase().includes(historyFilter.toLowerCase())
      )
    : savedReceipts;

  const toggleExpand = (id) => {
    setExpandedReceipts(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <>
      <div className="glass-card" style={{ padding: '0.75rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Buscar por mercado..."
          value={historyFilter}
          onChange={(e) => setHistoryFilter(e.target.value)}
          style={{ border: 'none', background: 'transparent' }}
        />
      </div>

      <div className="items-list" style={{ gap: '1.25rem' }}>
        {filteredReceipts.map(receipt => {
          const isExpanded = expandedReceipts.includes(receipt.id);
          const total = receipt.items.reduce((acc, curr) => acc + parseFloat(curr.total.replace(',', '.')), 0);

          return (
            <div
              key={receipt.id}
              className="glass-card"
              style={{ padding: '0', overflow: 'hidden', marginBottom: 0 }}
            >
              {/* Header */}
              <div 
                onClick={() => toggleExpand(receipt.id)}
                style={{ padding: '1.25rem', cursor: 'pointer', position: 'relative' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{receipt.establishment}</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{receipt.date}</span>
                      <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary)', padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem' }}>
                        {receipt.items.length} itens
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                      R$ {total.toFixed(2).replace('.', ',')}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteReceipt(receipt.id); }}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '0.5rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem', color: '#64748b' }}>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div style={{ background: 'rgba(15, 23, 42, 0.3)', borderTop: '1px solid var(--card-border)', padding: '1rem' }}>
                  {receipt.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: idx === receipt.items.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 500 }}>{item.name}</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.qty} x R$ {item.unitPrice}</div>
                          {item.category && (
                            <span style={{ 
                              fontSize: '0.65rem', 
                              background: item.category === 'Geral' ? 'rgba(255,255,255,0.03)' : 'rgba(16, 185, 129, 0.1)', 
                              color: item.category === 'Geral' ? '#64748b' : 'var(--success)', 
                              padding: '1px 6px', 
                              borderRadius: '4px', 
                              border: `1px solid ${item.category === 'Geral' ? 'rgba(255,255,255,0.05)' : 'rgba(16, 185, 129, 0.2)'}`,
                              fontWeight: item.category === 'Geral' ? 400 : 600
                            }}>
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ color: '#cbd5e1', fontWeight: 600, fontSize: '0.9rem' }}>R$ {item.total}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default HistoryTab;
