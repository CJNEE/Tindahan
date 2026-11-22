import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';

export default function ReceiptsList() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const today = new Date().toISOString().split('T')[0];

  const setQuickToday = () => {
    setDateFrom(today);
    setDateTo(today);
  };

  const setQuickThisWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    setDateFrom(startOfWeek.toISOString().split('T')[0]);
    setDateTo(today);
  };

  const filteredSales = sales.filter(s => {
    const saleDate = new Date(s.date || s.created_at || Date.now()).toISOString().split('T')[0];
    if (dateFrom && saleDate < dateFrom) return false;
    if (dateTo && saleDate > dateTo) return false;
    return true;
  });
  
  useEffect(() => {
    setLoading(true);
    const getLocalSales = () => JSON.parse(localStorage.getItem('sari_local_sales') || '[]');
    const stored = getLocalSales();
    
    api.get('/sales/')
      .then(r => {
        const apiData = r.data || [];
        const map = new Map(apiData.map(s => [s.id || s.invoice_no, s]));
        stored.forEach(s => {
          const key = s.id || s.invoice_no;
          if (!map.has(key)) map.set(key, s);
        });
        setSales(Array.from(map.values()));
      })
      .catch(() => {
        setSales(stored);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>🧾 Receipts & Invoices</h2>
          <p>Full archive of customer orders, invoices, and sales receipts</p>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="card" style={{ marginBottom: '16px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>📅 Filter by Date:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="date"
              className="form-input"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{ width: '155px', height: '38px', fontSize: '13px' }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>to</span>
            <input
              type="date"
              className="form-input"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{ width: '155px', height: '38px', fontSize: '13px' }}
            />
          </div>
          <button className="btn btn-sm btn-secondary" onClick={setQuickToday} style={{ height: '38px' }}>📆 Today</button>
          <button className="btn btn-sm btn-secondary" onClick={setQuickThisWeek} style={{ height: '38px' }}>📅 This Week</button>
          {(dateFrom || dateTo) && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              style={{ height: '38px', color: 'var(--crimson)', borderColor: 'var(--crimson)' }}
            >
              ✕ Clear
            </button>
          )}
          {(dateFrom || dateTo) && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Showing {filteredSales.length} of {sales.length} receipts
            </span>
          )}
        </div>
      </div>
      
      <div className="card table-container">
        {loading ? (
          <div className="loading-spinner"></div>
        ) : filteredSales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            {sales.length === 0 ? 'No sales or receipts found. Make a purchase in POS Shop to generate one!' : 'No receipts found for the selected date range.'}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Payment Mode</th>
                <th>Total</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(s => {
                const isUtang = s.type === 'utang' || (s.amount_paid !== undefined && Number(s.amount_paid) < Number(s.total_amount));
                const statusStr = isUtang ? 'utang' : (s.status || 'paid');
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: '700', color: 'var(--gold-200)' }}>{s.invoice_no}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(s.date || s.created_at || Date.now()).toLocaleDateString()}
                    </td>
                    <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                      {s.payment_method || (isUtang ? 'Credit' : 'Cash')}
                    </td>
                    <td style={{ fontWeight: '800', color: 'var(--gold-300)' }}>
                      ₱{Number(s.total_amount).toFixed(2)}
                    </td>
                    <td><StatusBadge status={statusStr} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <Link 
                        to={`/receipt?id=${s.id}`} 
                        className="btn btn-sm btn-secondary"
                        style={{ borderColor: 'var(--border-gold)', color: 'var(--gold-300)' }}
                      >
                        🖨️ View Receipt
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
  );
}
