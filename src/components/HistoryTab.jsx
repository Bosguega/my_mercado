import { History, Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react';
import PropTypes from 'prop-types';

// Skeleton Loading Component
const SkeletonReceipt = () => (
  <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
      <div>
        <div className="skeleton-line" style={{ width: '180px', height: '20px', marginBottom: '8px' }} />
        <div className="skeleton-line" style={{ width: '120px', height: '16px' }} />
      </div>
      <div className="skeleton-line" style={{ width: '80px', height: '32px', borderRadius: '8px' }} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton-item">
          <div className="skeleton-line" style={{ width: '60%', height: '16px', marginBottom: '6px' }} />
          <div className="skeleton-line" style={{ width: '40%', height: '14px' }} />
        </div>
      ))}
    </div>
  </div>
);

function HistoryTab({ savedReceipts, historyFilter, setHistoryFilter, historyFilters, setHistoryFilters, expandedReceipts, setExpandedReceipts, deleteReceipt, loading }) {
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

  // Apply advanced filters
  const applyFilters = (receipts) => {
    let filtered = [...receipts];
    
    // Filter by period
    if (historyFilters.period !== 'all') {
      const now = new Date();
      // Corrigir: Este mês deve considerar do dia 1 até o final do mês atual
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      thisMonthStart.setHours(0, 0, 0, 0); // Início do dia
      const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      thisMonthEnd.setHours(23, 59, 59, 999); // Fim do dia
      const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      last3Months.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(receipt => {
        // Converter data DD/MM/AAAA HH:mm:ss ou DD/MM/AAAA para Date de forma confiável
        const dateParts = receipt.date.split(' ');
        const [day, month, year] = dateParts[0].split('/');
        const receiptDate = new Date(year, month - 1, day);
        receiptDate.setHours(0, 0, 0, 0); // Normalizar hora para meia-noite
        
        let passes = false;
        
        if (historyFilters.period === 'this-month') {
          passes = receiptDate >= thisMonthStart && receiptDate <= thisMonthEnd;
        }
        else if (historyFilters.period === 'last-3-months') {
          passes = receiptDate >= last3Months;
        }
        else if (historyFilters.period === 'custom' && historyFilters.startDate && historyFilters.endDate) {
          const startDate = new Date(historyFilters.startDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(historyFilters.endDate);
          endDate.setHours(23, 59, 59, 999); // Incluir o dia final completo
          passes = receiptDate >= startDate && receiptDate <= endDate;
        }
        else {
          passes = true;
        }
        
        return passes;
      });
    }
    
    // Sort
    filtered.sort((a, b) => {
      const totalA = a.items.reduce((acc, item) => acc + parseFloat((item.total || '').replace(',', '.')), 0);
      const totalB = b.items.reduce((acc, item) => acc + parseFloat((item.total || '').replace(',', '.')), 0);
      
      if (historyFilters.sortBy === 'date') {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return historyFilters.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      if (historyFilters.sortBy === 'value') {
        return historyFilters.sortOrder === 'asc' ? totalA - totalB : totalB - totalA;
      }
      
      if (historyFilters.sortBy === 'store') {
        const storeA = a.establishment.toLowerCase();
        const storeB = b.establishment.toLowerCase();
        if (historyFilters.sortOrder === 'asc') {
          return storeA.localeCompare(storeB);
        } else {
          return storeB.localeCompare(storeA);
        }
      }
      
      return 0;
    });
    
    return filtered;
  };
  
  const finalFilteredReceipts = applyFilters(filteredReceipts);

  const toggleExpand = (id) => {
    setExpandedReceipts(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <>
      {/* Search Input */}
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

      {/* Advanced Filters */}
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <select 
            className="search-input" 
            value={historyFilters.period}
            onChange={(e) => setHistoryFilters({...historyFilters, period: e.target.value})}
            style={{ background: 'rgba(255,255,255,0.95)', color: '#1e293b', cursor: 'pointer', fontWeight: '500' }}
          >
            <option value="all">📅 Todo período</option>
            <option value="this-month">📅 Este mês</option>
            <option value="last-3-months">📅 Últimos 3 meses</option>
            <option value="custom">📅 Período personalizado</option>
          </select>
          
          <select 
            className="search-input" 
            value={historyFilters.sortBy}
            onChange={(e) => setHistoryFilters({...historyFilters, sortBy: e.target.value})}
            style={{ background: 'rgba(255,255,255,0.95)', color: '#1e293b', cursor: 'pointer', fontWeight: '500' }}
          >
            <option value="date">📊 Ordenar por data</option>
            <option value="value">💰 Ordenar por valor</option>
            <option value="store">🏪 Ordenar por mercado</option>
          </select>
        </div>
        
        {/* Custom Period Date Pickers */}
        {historyFilters.period === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Data inicial</label>
              <input 
                type="date" 
                className="search-input"
                value={historyFilters.startDate || ''}
                onChange={(e) => setHistoryFilters({...historyFilters, startDate: e.target.value})}
                style={{ background: 'rgba(255,255,255,0.95)', color: '#1e293b', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Data final</label>
              <input 
                type="date" 
                className="search-input"
                value={historyFilters.endDate || ''}
                onChange={(e) => setHistoryFilters({...historyFilters, endDate: e.target.value})}
                style={{ background: 'rgba(255,255,255,0.95)', color: '#1e293b', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        )}
        
        <button 
          onClick={() => setHistoryFilters({...historyFilters, sortOrder: historyFilters.sortOrder === 'asc' ? 'desc' : 'asc'})}
          style={{ 
            width: '100%', 
            marginTop: '0.75rem',
            padding: '0.6rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          {historyFilters.sortOrder === 'asc' ? '⬆️ Crescente' : '⬇️ Decrescente'}
        </button>
      </div>

      <div className="items-list" style={{ gap: '1.25rem' }}>
        {loading ? (
          // Mostrar skeletons durante loading
          [...Array(3)].map((_, i) => <SkeletonReceipt key={i} />)
        ) : filteredReceipts.length === 0 ? (
          // Mensagem quando filtro não retorna nada
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <Search size={48} color="var(--primary)" style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#e2e8f0', marginTop: '1rem' }}>Nenhuma nota encontrada</h3>
            <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
              Tente buscar por outro termo ou mercado.
            </p>
          </div>
        ) : (
          finalFilteredReceipts.map(receipt => {
          const isExpanded = expandedReceipts.includes(receipt.id);
          
          // Calcular total de forma segura, evitando NaN
          const total = receipt.items.reduce((acc, curr) => {
            const value = parseFloat((curr.total || '').toString().replace(',', '.'));
            return acc + (isNaN(value) ? 0 : value);
          }, 0);

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
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.qty} x R$ {item.unitPrice}</div>
                      </div>
                      <div style={{ color: '#cbd5e1', fontWeight: 600, fontSize: '0.9rem' }}>R$ {item.total}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
          })
        )}
      </div>
    </>
  );
}

HistoryTab.propTypes = {
  savedReceipts: PropTypes.arrayOf(PropTypes.object).isRequired,
  historyFilter: PropTypes.string.isRequired,
  setHistoryFilter: PropTypes.func.isRequired,
  historyFilters: PropTypes.shape({
    period: PropTypes.string.isRequired,
    sortBy: PropTypes.string.isRequired,
    sortOrder: PropTypes.string.isRequired,
    startDate: PropTypes.string,
    endDate: PropTypes.string
  }).isRequired,
  setHistoryFilters: PropTypes.func.isRequired,
  expandedReceipts: PropTypes.arrayOf(PropTypes.string).isRequired,
  setExpandedReceipts: PropTypes.func.isRequired,
  deleteReceipt: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired
};

export default HistoryTab;
