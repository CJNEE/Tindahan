import React, { useEffect, useState } from 'react';
import api from '../api';

const FALLBACK_CUSTOMERS = [
  { id: 1, name: 'Maria Santos', phone: '0917-123-4567', address: 'Brgy. San Antonio', credit_status: 'warning', total_utang: 450.00, utang: 450.00, utang_balance: 450.00 },
  { id: 2, name: 'Juan Dela Cruz', phone: '0918-987-6543', address: 'Brgy. Poblacion', credit_status: 'good', total_utang: 280.00, utang: 280.00, utang_balance: 280.00 },
];

export default function Payments() {
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Searchable dropdown state
  const [custSearch, setCustSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setLoading(true);
    const storedCustomers = JSON.parse(localStorage.getItem('sari_local_customers') || '[]');
    const storedPays = JSON.parse(localStorage.getItem('sari_local_payments') || '[]');
    const localSales = JSON.parse(localStorage.getItem('sari_local_sales') || '[]');

    // 1. Fetch Customers and merge with localStorage
    api.get('/customers/')
      .then(r => {
        if (r.data && r.data.length > 0) {
          const map = new Map(r.data.map(c => [String(c.id), c]));
          storedCustomers.forEach(c => {
            if (!map.has(String(c.id))) map.set(String(c.id), c);
          });
          const merged = Array.from(map.values());
          setCustomers(merged);
          localStorage.setItem('sari_local_customers', JSON.stringify(merged));
        } else {
          setCustomers(storedCustomers.length > 0 ? storedCustomers : FALLBACK_CUSTOMERS);
        }
      })
      .catch(() => {
        setCustomers(storedCustomers.length > 0 ? storedCustomers : FALLBACK_CUSTOMERS);
      });
    
    // 2. Fetch Payments and merge with localStorage
    api.get('/payments/')
      .then(r => {
        const apiPays = r.data || [];
        const payMap = new Map(apiPays.map(p => [String(p.id), p]));
        storedPays.forEach(p => {
          if (!payMap.has(String(p.id))) payMap.set(String(p.id), p);
        });
        const mergedPays = Array.from(payMap.values());
        setPayments(mergedPays);
        localStorage.setItem('sari_local_payments', JSON.stringify(mergedPays));
      })
      .catch(() => {
        setPayments(storedPays);
      });

    // 3. Fetch Sales
    api.get('/sales/')
      .then(r => {
        const apiSales = r.data || [];
        const map = new Map(apiSales.map(s => [s.id || s.invoice_no, s]));
        localSales.forEach(s => {
          const key = s.id || s.invoice_no;
          if (!map.has(key)) map.set(key, s);
        });
        setSales(Array.from(map.values()));
      })
      .catch(() => setSales(localSales))
      .finally(() => setLoading(false));
  }

  function getCustomerUtangInfo(cId, customPayments = null) {
    if (!cId) return { totalUtang: 0, totalPaid: 0, balance: 0 };
    const cust = customers.find(c => String(c.id) === String(cId));
    
    const custSales = sales.filter(s => (String(s.customer) === String(cId) || (String(cId) === '1' && String(s.customer) === 'f1')) && s.type === 'utang');
    const salesTotal = custSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const baseUtang = salesTotal > 0 
      ? salesTotal 
      : (cust ? (cust.total_utang !== undefined ? Number(cust.total_utang) : (cust.utang !== undefined ? Number(cust.utang) : (cust.utang_balance !== undefined ? Number(cust.utang_balance) : 0))) : 0);

    const paysToUse = customPayments || payments;
    const custPayments = paysToUse.filter(p => 
      String(p.customer_id) === String(cId) || 
      String(p.customer) === String(cId) ||
      (String(cId) === '1' && (String(p.customer) === 'f1' || String(p.customer_id) === 'f1')) ||
      (String(cId) === 'f1' && (String(p.customer) === '1' || String(p.customer_id) === '1'))
    );
    const paidTotal = custPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const balance = Math.max(0, baseUtang - paidTotal);
    return {
      totalUtang: baseUtang,
      totalPaid: paidTotal,
      balance: balance,
      customerName: cust ? cust.name : 'Customer'
    };
  }

  async function submit(e) {
    e.preventDefault();
    if (!customerId || !amount || isSubmitting) return;
    setIsSubmitting(true);

    const numAmount = Number(amount);
    const targetCustId = !isNaN(Number(customerId)) ? Number(customerId) : 1;
    const payload = { customer: targetCustId, customer_id: targetCustId, amount: numAmount };

    const selectedCust = customers.find(c => String(c.id) === String(customerId));
    const custName = selectedCust ? selectedCust.name : 'Customer';

    let newPay = {
      id: Date.now(),
      customer_id: targetCustId,
      customer: targetCustId,
      amount: numAmount,
      payment_date: new Date().toISOString()
    };

    try {
      const res = await api.post('/payments/', payload);
      if (res.data) newPay = { ...newPay, ...res.data };
    } catch (err) {
      console.warn("Payment API notice:", err);
    }

    // 1. Immediately persist to localStorage payments so refresh retains it
    const storedPays = JSON.parse(localStorage.getItem('sari_local_payments') || '[]');
    const payMap = new Map([[String(newPay.id), newPay]]);
    storedPays.forEach(p => { if (!payMap.has(String(p.id))) payMap.set(String(p.id), p); });
    payments.forEach(p => { if (!payMap.has(String(p.id))) payMap.set(String(p.id), p); });
    const mergedPays = Array.from(payMap.values());
    
    setPayments(mergedPays);
    localStorage.setItem('sari_local_payments', JSON.stringify(mergedPays));

    // 2. Calculate remaining balance and update customer state & localStorage
    const info = getCustomerUtangInfo(customerId, mergedPays);
    setPaymentSuccess({ customerName: custName, paidAmount: numAmount, newBalance: info.balance });

    const updatedCustomers = customers.map(c => {
      if (String(c.id) === String(customerId)) {
        return {
          ...c,
          utang: info.balance,
          utang_balance: info.balance,
          total_paid: (Number(c.total_paid) || 0) + numAmount
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);
    localStorage.setItem('sari_local_customers', JSON.stringify(updatedCustomers));

    setAmount('');
    setIsSubmitting(false);

    // 3. Sync latest customer balances from PostgreSQL
    try {
      const res = await api.get('/customers/');
      if (res.data && res.data.length) {
        setCustomers(res.data);
        localStorage.setItem('sari_local_customers', JSON.stringify(res.data));
      }
    } catch(err) {}
  }

  function getCustomerName(id) {
    const c = customers.find(c => String(c.id) === String(id));
    return c ? c.name : id;
  }

  const selectedUtangInfo = customerId ? getCustomerUtangInfo(customerId) : null;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>💵 Payments & Utang Settlement</h2>
          <p>Record customer cash payments to reduce and settle credit accounts</p>
        </div>
      </div>

      {paymentSuccess && (
        <div className="alert-success" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>✓ Payment Received:</strong> Paid <strong>₱{paymentSuccess.paidAmount.toFixed(2)}</strong> for <strong>{paymentSuccess.customerName}</strong>. Remaining Utang: <strong>₱{paymentSuccess.newBalance.toFixed(2)}</strong>.
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => setPaymentSuccess(null)}>Dismiss</button>
        </div>
      )}

      {/* Payment Entry Form */}
      <div className="card" style={{ marginBottom: 24, border: '1px solid var(--border-gold)', padding: '24px' }}>
        <h3 style={{ marginTop: 0, marginBottom: 18 }}>💳 Record Payment Transaction</h3>
        <form onSubmit={submit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Select Customer Account</label>
            {/* Hybrid Searchable Dropdown */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--input-bg, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                <span style={{ padding: '0 12px', color: 'var(--text-muted)', fontSize: '14px' }}>🔍</span>
                <input
                  type="text"
                  className="form-input"
                  placeholder={customerId ? (customers.find(c => String(c.id) === String(customerId))?.name || 'Select customer...') : 'Type to search customer...'}
                  value={custSearch}
                  onChange={e => { setCustSearch(e.target.value); setDropdownOpen(true); }}
                  onFocus={() => setDropdownOpen(true)}
                  style={{ border: 'none', background: 'transparent', flex: 1, height: '44px' }}
                  autoComplete="off"
                />
                {customerId && (
                  <button
                    type="button"
                    onClick={() => { setCustomerId(''); setCustSearch(''); setDropdownOpen(false); }}
                    style={{ padding: '0 12px', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer', background: 'none', border: 'none' }}
                    title="Clear selection"
                  >✕</button>
                )}
                <span style={{ padding: '0 12px', color: 'var(--text-muted)', fontSize: '12px' }}>▾</span>
              </div>
              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: 'var(--card-bg, #1a1a2e)',
                    border: '1px solid var(--border-gold)',
                    borderRadius: '10px',
                    zIndex: 999,
                    maxHeight: '220px',
                    overflowY: 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}
                >
                  {customers
                    .filter(c => !custSearch || c.name.toLowerCase().includes(custSearch.toLowerCase()) || (c.phone && c.phone.includes(custSearch)))
                    .map(c => {
                      const info = getCustomerUtangInfo(c.id);
                      const isSelected = String(c.id) === String(customerId);
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setCustomerId(String(c.id));
                            setCustSearch('');
                            setDropdownOpen(false);
                          }}
                          style={{
                            padding: '10px 16px',
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(212,160,23,0.15)' : 'transparent',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div>
                            <div style={{ fontWeight: '700', color: isSelected ? 'var(--gold-200)' : 'var(--text)', fontSize: '14px' }}>{c.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.phone || 'No phone'}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: info.balance > 0 ? 'var(--crimson)' : '#22c55e' }}>
                              {info.balance > 0 ? `₱${info.balance.toFixed(2)}` : '₱0.00'}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{info.balance > 0 ? 'Utang Due' : 'Paid ✓'}</div>
                          </div>
                        </div>
                      );
                    })
                  }
                  {customers.filter(c => !custSearch || c.name.toLowerCase().includes(custSearch.toLowerCase()) || (c.phone && c.phone.includes(custSearch))).length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No customers found
                    </div>
                  )}
                </div>
              )}
              {/* Invisible backdrop to close dropdown */}
              {dropdownOpen && (
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                  onClick={() => setDropdownOpen(false)}
                />
              )}
            </div>
            {/* Hidden required input for form validation */}
            <input type="hidden" value={customerId} required />
          </div>

          {/* Selected Customer Utang Info Card */}
          {selectedUtangInfo && (
            <div style={{ 
              background: 'rgba(212, 160, 23, 0.05)', 
              padding: '18px', 
              borderRadius: '12px', 
              border: '1px solid var(--border-gold)', 
              marginBottom: 18 
            }}>
              <div style={{ fontSize: '11px', color: 'var(--gold-400)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ACCOUNT LEDGER FOR {selectedUtangInfo.customerName.toUpperCase()}:
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Utang Owed</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: selectedUtangInfo.balance > 0 ? 'var(--crimson)' : '#16a34a' }}>
                    {selectedUtangInfo.balance > 0 ? `₱${selectedUtangInfo.balance.toFixed(2)}` : '₱0.00 🎉'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Payments Logged</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#16a34a' }}>
                    ₱{selectedUtangInfo.totalPaid.toFixed(2)}
                  </div>
                </div>
                {selectedUtangInfo.balance > 0 ? (
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setAmount(selectedUtangInfo.balance.toFixed(2))}
                    style={{ borderColor: 'var(--border-gold)', color: 'var(--gold-200)', fontWeight: '700' }}
                  >
                    ⚡ Auto-Fill Full Utang (₱{selectedUtangInfo.balance.toFixed(2)})
                  </button>
                ) : (
                  <span className="badge status-success" style={{ padding: '8px 14px', fontSize: '13px' }}>
                    Fully Paid ✓
                  </span>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '220px' }}>
              <label className="form-label">Amount to Pay (₱)</label>
              <input 
                className="form-input" 
                type="number" 
                step="0.01" 
                min="0.01" 
                placeholder="Enter payment amount" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                required 
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={isSubmitting} style={{ height: '46px', padding: '0 28px', fontSize: '15px' }}>
              {isSubmitting ? 'Processing...' : '✦ Process Payment'}
            </button>
          </div>
        </form>
      </div>

      {/* Payment History Table */}
      <div className="card table-container" style={{ padding: '22px' }}>
        <h3 style={{ marginBottom: 16 }}>💵 Payment Logs & History</h3>
        {loading ? (
          <div className="loading-spinner"></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Amount Paid</th>
                <th>Payment Date</th>
                <th>Reference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No payment transactions recorded yet.</td></tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: '700', color: 'var(--gold-200)' }}>{getCustomerName(p.customer_id || p.customer)}</td>
                    <td style={{ color: '#4ade80', fontWeight: '800' }}>₱{Number(p.amount).toFixed(2)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(p.payment_date || p.created_at || Date.now()).toLocaleDateString()}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>REF-{p.id}</td>
                    <td><span className="badge status-success">Completed</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
