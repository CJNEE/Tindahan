import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Receipt() {
  const [saleData, setSaleData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      setLoading(false);
      return;
    }

    // Check local storage first
    const localSales = JSON.parse(localStorage.getItem('sari_local_sales') || '[]');
    const found = localSales.find(s => String(s.id) === String(id) || s.invoice_no === id);

    if (found) {
      setSaleData(found);
      setLoading(false);
    } else {
      // Try API
      api.get(`/sales/${id}/`)
        .then(r => {
          setSaleData(r.data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!saleData) {
    return (
      <div className="card" style={{ maxWidth: '440px', margin: '40px auto', textAlign: 'center', padding: '30px' }}>
        <h3>Receipt Not Found</h3>
        <p style={{ color: 'var(--text-muted)', margin: '10px 0 20px' }}>The requested receipt record could not be loaded.</p>
        <button onClick={() => window.history.back()} className="btn btn-primary">Back</button>
      </div>
    );
  }

  const isUtang = saleData.type === 'utang' || (saleData.amount_paid !== undefined && Number(saleData.amount_paid) < Number(saleData.total_amount));

  return (
    <div style={{ padding: '30px 16px', display: 'flex', justifyContent: 'center', minHeight: 'calc(100vh - 120px)' }}>
      <div 
        className="card" 
        style={{ 
          maxWidth: '440px', 
          width: '100%', 
          padding: '28px', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px solid var(--border-gold)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          position: 'relative'
        }}
      >
        {/* Gold top accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--gradient-gold)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }} />

        {/* Logo and Brand */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            background: 'var(--gradient-gold)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#0a0a0a', 
            fontWeight: '900', 
            fontSize: '18px', 
            margin: '0 auto 10px' 
          }}>
            SS
          </div>
          <h2 style={{ margin: 0, fontFamily: 'Playfair Display, serif', color: 'var(--gold-200)', fontSize: '22px' }}>
            SARI-SARI STORE
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Official Customer Receipt</div>
        </div>

        {/* Metadata info */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>Invoice: <strong style={{ color: 'var(--gold-300)' }}>{saleData.invoice_no || `INV-${saleData.id}`}</strong></div>
          <div>Date: <span>{new Date(saleData.created_at || saleData.date || Date.now()).toLocaleString()}</span></div>
          <div>Cashier: <span>{saleData.cashier || 'Admin'}</span></div>
        </div>

        {/* Items Table */}
        <div style={{ borderTop: '1px dashed var(--border-gold)', borderBottom: '1px dashed var(--border-gold)', padding: '14px 0', margin: '14px 0' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--gold-500)', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ textAlign: 'left', paddingBottom: 8 }}>Item</th>
                <th style={{ textAlign: 'center', paddingBottom: 8 }}>Qty</th>
                <th style={{ textAlign: 'right', paddingBottom: 8 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {saleData.items && saleData.items.length > 0 ? (
                saleData.items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 0' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text)' }}>
                        {it.product_name || it.name || `Item #${idx + 1}`}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        ₱{Number(it.unit_price || 0).toFixed(2)} each
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px 0', verticalAlign: 'top' }}>{it.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '8px 0', verticalAlign: 'top', fontWeight: '700', color: 'var(--gold-300)' }}>
                      ₱{Number(it.subtotal || ((it.unit_price || 0) * it.quantity)).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ padding: '10px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Standard Sale Order
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '14px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '800', color: 'var(--gold-200)' }}>
            <span>TOTAL AMOUNT:</span>
            <span>₱{Number(saleData.total_amount || 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span>Amount Paid:</span>
            <span>₱{Number(isUtang ? (saleData.amount_paid || 0) : (saleData.amount_paid || saleData.total_amount || 0)).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', alignItems: 'center', marginTop: '4px' }}>
            <span>Payment Status:</span>
            <span className={`badge ${isUtang ? 'status-danger' : 'status-success'}`}>
              {isUtang ? 'UTANG (UNPAID)' : 'PAID (COMPLETED)'}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center', borderTop: '1px dashed var(--border)', paddingTop: 16 }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gold-300)' }}>Maraming Salamat Po! ✦</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>Please come again! 🛍️</div>
        </div>

        <div style={{ marginTop: 22, display: 'flex', gap: 10 }} className="no-print">
          <button onClick={() => window.print()} className="btn btn-primary" style={{ flex: 1 }}>
            🖨️ Print Receipt
          </button>
          <button onClick={() => window.history.back()} className="btn btn-secondary">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
