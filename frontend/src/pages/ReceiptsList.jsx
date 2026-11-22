import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';

export default function ReceiptsList() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
      
      <div className="card table-container">
        {loading ? (
          <div className="loading-spinner"></div>
        ) : sales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No sales or receipts found. Make a purchase in POS Shop to generate one!
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
              {sales.map(s => {
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
