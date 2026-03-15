import { useState } from 'react';
import { LineChart as LineChartIcon, ArrowLeft, Search } from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PropTypes from 'prop-types';
// Skeleton para itens da pesquisa
const SkeletonSearch = () => (
  <div className="item-row" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
    <div style={{ flex: 1 }}>
      <div className="skeleton-line" style={{ width: '60%', height: '18px', marginBottom: '8px' }} />
      <div className="skeleton-line" style={{ width: '40%', height: '14px' }} />
    </div>
    <div style={{ textAlign: 'right' }}>
      <div className="skeleton-line" style={{ width: '80px', height: '20px', marginBottom: '4px' }} />
      <div className="skeleton-line" style={{ width: '40px', height: '12px', marginLeft: 'auto' }} />
    </div>
  </div>
);

function SearchTab({ savedReceipts, searchQuery, setSearchQuery, sortOrder, setSortOrder, loading }) {
  const [showChart, setShowChart] = useState(false);

  // Flatten all items across all receipts
  const allPurchasedItems = [];
  savedReceipts.forEach((receipt) => {
    if (receipt && Array.isArray(receipt.items)) {
      receipt.items.forEach((item) => {
        allPurchasedItems.push({
          ...item,
          purchasedAt: receipt.date,
          store: receipt.establishment,
        });
      });
    }
  });

  const filtered = searchQuery.trim() === ''
    ? allPurchasedItems.slice(0, 20) // show only 20 recent if no search
    : allPurchasedItems.filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Group items by exact name to create grouped results.
  const groupedItems = filtered.reduce((acc, curr) => {
    if (!acc[curr.name]) acc[curr.name] = [];
    acc[curr.name].push(curr);
    return acc;
  }, {});

  const parseBRL = (val) => {
    if (!val) return 0;
    const cleaned = String(val).replace(/[^\d.,]/g, '');
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return Number.isNaN(num) ? 0 : num;
  };

  if (showChart) {
    const allDates = new Set();
    Object.keys(groupedItems).forEach((key) => {
      groupedItems[key].forEach((historyItem) => {
        if (historyItem.purchasedAt) {
          allDates.add(historyItem.purchasedAt.substring(0, 10));
        }
      });
    });

    const sortedDates = Array.from(allDates).sort((a, b) => {
      const dA = a.split('/');
      const dB = b.split('/');
      if (dA.length < 3 || dB.length < 3) return 0;
      return new Date(`${dA[2]}-${dA[1]}-${dA[0]}`).getTime() - new Date(`${dB[2]}-${dB[1]}-${dB[0]}`).getTime();
    });

    const chartData = sortedDates.map((dateStr) => {
      const dataPoint = { date: dateStr };
      Object.keys(groupedItems).forEach((itemName) => {
        const match = groupedItems[itemName].find((h) => h.purchasedAt && h.purchasedAt.startsWith(dateStr));
        if (match) {
          dataPoint[itemName] = parseBRL(match.unitPrice);
        }
      });
      return dataPoint;
    });

    const colors = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    return (
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <button
          className="btn"
          onClick={() => setShowChart(false)}
          style={{
            marginBottom: '1.5rem',
            background: 'rgba(255,255,255,0.05)',
            boxShadow: 'none',
            color: '#94a3b8',
            padding: '0.5rem 1rem',
            fontSize: '0.85rem'
          }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <h3 style={{ marginBottom: '1.5rem', color: '#fff', fontSize: '1.2rem' }}>Tendência de Preços</h3>

        <div style={{ width: '100%', height: 300, marginTop: '1rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="5 5" vertical={false} />
              <XAxis dataKey="date" stroke="#475569" fontSize={10} tickMargin={10} />
              <YAxis
                stroke="#475569"
                fontSize={10}
                tickFormatter={(value) => `R$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '12px',
                  fontSize: '0.8rem'
                }}
                itemStyle={{ padding: '2px 0' }}
                cursor={{ stroke: '#334155' }}
              />
              {Object.keys(groupedItems).map((itemName, idx) => (
                <Line
                  key={itemName}
                  type="monotone"
                  name={itemName}
                  dataKey={itemName}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: colors[idx % colors.length] }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Pesquisar itens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            style={{ paddingLeft: '3rem' }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Filtrar por:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--primary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="recent">Recentes</option>
            <option value="price-asc">Menor Preço</option>
            <option value="price-desc">Maior Preço</option>
          </select>
        </div>
      </div>

      <div className="items-list">
        {loading ? (
          [...Array(6)].map((_, i) => <SkeletonSearch key={i} />)
        ) : (
          <>
            {searchQuery && filtered.length > 0 && (
          <button
            className="btn btn-success"
            style={{ width: '100%', marginBottom: '0.5rem', borderRadius: '1rem' }}
            onClick={() => setShowChart(true)}
          >
            <LineChartIcon size={18} />
            Analisar Histórico de Preços
          </button>
        )}

        {searchQuery === '' && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <Search size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>Seus itens comprados aparecerão aqui.</p>
          </div>
        )}

        {filtered.map((item, idx) => (
          <div key={idx} className="item-row" style={{ animationDelay: `${idx * 0.05}s` }}>
            <div style={{ flex: 1 }}>
              <div className="item-name">{item.name}</div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}>{item.store}</span>
                <span style={{ fontSize: '0.75rem', color: '#475569' }}>{item.purchasedAt?.split(' ')[0]}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: '1.2rem' }}>
                R$ {parseBRL(item.unitPrice).toFixed(2).replace('.', ',')}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#475569' }}>por un.</div>
            </div>
          </div>
        ))}

            {searchQuery && filtered.length === 0 && (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Nenhum item encontrado.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

SearchTab.propTypes = {
  savedReceipts: PropTypes.arrayOf(PropTypes.object).isRequired,
  searchQuery: PropTypes.string.isRequired,
  setSearchQuery: PropTypes.func.isRequired,
  sortOrder: PropTypes.string.isRequired,
  setSortOrder: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired
};

export default SearchTab;
