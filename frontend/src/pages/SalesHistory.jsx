import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSales();
  }, []);

  function loadSales() {
    setLoading(true);
    const localSales = JSON.parse(localStorage.getItem('sari_local_sales') || '[]');
    api.get('/sales/')
      .then(r => {
        const apiData = r.data || [];
        const map = new Map(apiData.map(s => [s.id || s.invoice_no, s]));
        localSales.forEach(s => {
          const key = s.id || s.invoice_no;
          if (!map.has(key)) map.set(key, s);
        });
        setSales(Array.from(map.values()));
      })
      .catch(() => setSales(localSales))
      .finally(() => setLoading(false));
  }

  // Filter sales for the selected calendar date
  const filteredSales = sales.filter(s => {
    if (!s.created_at && !s.date) return selectedDate === new Date().toISOString().split('T')[0];
    const sDate = (s.created_at || s.date || '').split('T')[0];
    return sDate === selectedDate;
  });

  const totalDayRevenue = filteredSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalTransactions = filteredSales.length;

  // Aggregate items sold on the selected date
  const itemsMap = new Map();
  filteredSales.forEach(s => {
    if (s.items && Array.isArray(s.items)) {
      s.items.forEach(it => {
        const name = it.product_name || it.name || `Item #${it.product || 1}`;
        const qty = Number(it.quantity || 1);
        const subtotal = Number(it.subtotal || ((it.unit_price || 0) * qty) || 0);

        if (itemsMap.has(name)) {
          const existing = itemsMap.get(name);
          itemsMap.set(name, {
            name,
            qty: existing.qty + qty,
            revenue: existing.revenue + subtotal
          });
        } else {
          itemsMap.set(name, { name, qty, revenue: subtotal });
        }
      });
    }
  });

  const aggregatedItems = Array.from(itemsMap.values());
  const totalItemsSold = aggregatedItems.reduce((sum, i) => sum + i.qty, 0);

  const formattedDisplayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="page-container">
      {/* Header & Calendar Date Filter */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h2>📅 Sales History & Reports</h2>
          <p>Inspect daily breakdown, items sold, and revenue for {formattedDisplayDate}</p>
        </div>

        {/* Date Selector Input */}
        <div className="card" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gold-400)' }}>Date:</label>
          <input 
            type="date" 
            className="form-input"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '8px' }}
          />
          <button 
            className="btn btn-sm btn-secondary" 
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          >
            Today
          </button>
        </div>
      </div>

      {/* Selected Date Metrics Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '24px' }}>
        <div className="dashboard-stat-card" style={{ padding: '20px', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Daily Revenue</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--gold-300)', marginTop: '6px' }}>₱{totalDayRevenue.toFixed(2)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Sales on selected date</div>
        </div>

        <div className="dashboard-stat-card" style={{ padding: '20px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transactions Count</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#60a5fa', marginTop: '6px' }}>{totalTransactions} orders</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Orders logged</div>
        </div>

        <div className="dashboard-stat-card" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Units Sold</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#fbbf24', marginTop: '6px' }}>{totalItemsSold} units</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Total items purchased</div>
        </div>
      </div>

      {/* Two Column Layout: Aggregated Items Sold + Orders List */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
        {/* Left Column: Items Bought on Selected Date */}
        <div className="card table-container" style={{ padding: '22px' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>🛍️ Items Sold ({aggregatedItems.length})</h3>

          {aggregatedItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🛒</div>
              <p>No items purchased on this date.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th style={{ textAlign: 'center' }}>Units Sold</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedItems.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: '700', color: 'var(--gold-200)' }}>{item.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge status-muted">{item.qty} pcs</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--gold-300)' }}>
                      ₱{item.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Column: Transactions List on Selected Date */}
        <div className="card table-container" style={{ padding: '22px' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>🧾 Invoices & Orders ({filteredSales.length})</h3>

          {filteredSales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📄</div>
              <p>No transactions found for this date.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Time</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(s => {
                  const sTime = s.created_at || s.date ? new Date(s.created_at || s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: '700', color: 'var(--gold-200)' }}>{s.invoice_no}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sTime}</td>
                      <td>
                        <StatusBadge status={s.type === 'utang' ? 'utang' : 'paid'} />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--gold-300)' }}>
                        ₱{Number(s.total_amount || 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Link 
                          to={`/receipt?id=${s.id}`} 
                          className="btn btn-sm btn-secondary" 
                          style={{ borderColor: 'var(--border-gold)', color: 'var(--gold-300)', fontSize: '11px', padding: '2px 8px' }}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
