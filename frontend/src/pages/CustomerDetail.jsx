import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';

const FALLBACK_CUSTOMERS = [
  { id: 1, name: 'Maria Santos', phone: '0917-123-4567', address: 'Brgy. San Antonio', credit_status: 'warning', total_utang: 450.00, utang: 450.00, utang_balance: 450.00 },
  { id: 2, name: 'Juan Dela Cruz', phone: '0918-987-6543', address: 'Brgy. Poblacion', credit_status: 'good', total_utang: 280.00, utang: 280.00, utang_balance: 280.00 },
];

const FALLBACK_PRODUCTS = [
  { id: 1, name: 'Coca-Cola 1.5L', selling_price: 85.00 },
  { id: 2, name: 'Lucky Me Pancit Canton', selling_price: 12.50 },
  { id: 3, name: 'Argentina Corned Beef', selling_price: 42.00 },
  { id: 4, name: 'Kopiko Brown Coffee 25g', selling_price: 8.00 },
  { id: 5, name: 'Tide Powder Detergent 80g', selling_price: 15.00 },
];

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Utang modal form states
  const [showAddUtang, setShowAddUtang] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [utangQty, setUtangQty] = useState(1);
  const [utangPrice, setUtangPrice] = useState('');
  const [utangMessage, setUtangMessage] = useState(null);

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  function loadCustomerData() {
    setLoading(true);
    const storedCustomers = JSON.parse(localStorage.getItem('sari_local_customers') || '[]');
    const storedPays = JSON.parse(localStorage.getItem('sari_local_payments') || '[]');
    const localSales = JSON.parse(localStorage.getItem('sari_local_sales') || '[]');

    api.get(`/customers/${id}/`)
      .then(r => setCustomer(r.data))
      .catch(() => {
        const localCust = storedCustomers.find(f => String(f.id) === String(id) || (String(id) === '1' && String(f.id) === 'f1'));
        const fallback = FALLBACK_CUSTOMERS.find(f => String(f.id) === String(id) || (String(id) === '1' && String(f.id) === 'f1'));
        setCustomer(localCust || fallback);
      });

    api.get('/products/')
      .then(r => setProducts(r.data && r.data.length ? r.data : FALLBACK_PRODUCTS))
      .catch(() => setProducts(FALLBACK_PRODUCTS));

    // Get sales (utang) for customer
    api.get('/sales/').then(r => {
      const apiSales = (r.data || []).filter(s => String(s.customer) === String(id) || (String(id) === '1' && String(s.customer) === 'f1'));
      const map = new Map(apiSales.map(s => [s.id || s.invoice_no, s]));
      localSales.filter(s => String(s.customer) === String(id) || (String(id) === '1' && String(s.customer) === 'f1')).forEach(s => {
        const key = s.id || s.invoice_no;
        if (!map.has(key)) map.set(key, s);
      });
      setSales(Array.from(map.values()));
    }).catch(() => {
      setSales(localSales.filter(s => String(s.customer) === String(id) || (String(id) === '1' && String(s.customer) === 'f1')));
    });

    api.get('/payments/')
      .then(r => {
        const apiPays = r.data || [];
        const payMap = new Map(apiPays.map(p => [String(p.id), p]));
        storedPays.forEach(p => { if (!payMap.has(String(p.id))) payMap.set(String(p.id), p); });
        const allPays = Array.from(payMap.values());
        const custPays = allPays.filter(p => 
          String(p.customer_id) === String(id) || 
          String(p.customer) === String(id) ||
          (String(id) === '1' && (String(p.customer) === 'f1' || String(p.customer_id) === 'f1')) ||
          (String(id) === 'f1' && (String(p.customer) === '1' || String(p.customer_id) === '1'))
        );
        setPayments(custPays);
      })
      .catch(() => {
        const custPays = storedPays.filter(p => 
          String(p.customer_id) === String(id) || 
          String(p.customer) === String(id) ||
          (String(id) === '1' && (String(p.customer) === 'f1' || String(p.customer_id) === 'f1')) ||
          (String(id) === 'f1' && (String(p.customer) === '1' || String(p.customer_id) === '1'))
        );
        setPayments(custPays);
      })
      .finally(() => setLoading(false));
  }

  const handleProductSelect = (prodId) => {
    setSelectedProductId(prodId);
    if (!prodId) return;
    const prod = products.find(p => String(p.id) === String(prodId));
    if (prod) {
      setCustomItemName(prod.name);
      setUtangPrice(prod.selling_price);
    }
  };

  const handleAddUtang = async (e) => {
    e.preventDefault();
    if ((!customItemName && !selectedProductId) || !utangPrice) return;

    const qty = Number(utangQty) || 1;
    const price = Number(utangPrice) || 0;
    const totalAmount = qty * price;
    const invoiceNo = 'UTANG-' + Math.floor(100000 + Math.random() * 900000);
    const itemName = customItemName || 'Utang Item';

    const utangSale = {
      id: Date.now(),
      invoice_no: invoiceNo,
      customer: !isNaN(Number(id)) ? Number(id) : id,
      type: 'utang',
      total_amount: totalAmount,
      amount_paid: 0.00,
      payment_method: 'credit',
      cashier: 'Admin',
      created_at: new Date().toISOString(),
      items: [
        {
          product: selectedProductId ? (!isNaN(Number(selectedProductId)) ? Number(selectedProductId) : 1) : 1,
          product_name: itemName,
          name: itemName,
          quantity: qty,
          unit_price: price,
          subtotal: totalAmount
        }
      ]
    };

    try {
      await api.post('/sales/', utangSale);
    } catch(err) {
      console.warn('Error saving utang:', err);
    }

    const storedSales = JSON.parse(localStorage.getItem('sari_local_sales') || '[]');
    localStorage.setItem('sari_local_sales', JSON.stringify([utangSale, ...storedSales]));
    
    setSales(prev => [utangSale, ...prev]);
    setUtangMessage(`Recorded "${itemName}" (₱${totalAmount.toFixed(2)}) on Utang!`);
    setSelectedProductId('');
    setCustomItemName('');
    setUtangQty(1);
    setUtangPrice('');
    setShowAddUtang(false);
  };

  const totalUtangSales = sales.reduce((s, x) => s + Number(x.total_amount || 0), 0);
  const baseDebt = customer?.total_utang ? Number(customer.total_utang) : (customer?.utang ? Number(customer.utang) : (customer?.utang_balance ? Number(customer.utang_balance) : 0));
  const displayOwed = totalUtangSales > 0 ? totalUtangSales : baseDebt;
  const paid = payments.reduce((s, x) => s + Number(x.amount || 0), 0);
  const balance = Math.max(0, displayOwed - paid);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>👤 {customer ? customer.name : 'Customer Details'}</h2>
          <p>Customer Profile, Credit History & Payment Records</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => setShowAddUtang(!showAddUtang)}>
            {showAddUtang ? '✕ Cancel' : '📝 Add New Utang Item'}
          </button>
          <Link to="/payments" className="btn btn-secondary" style={{ borderColor: 'var(--border-gold)', color: 'var(--gold-300)' }}>
            💳 Receive Payment
          </Link>
          <Link to="/customers" className="btn btn-secondary">Back to Customers</Link>
        </div>
      </div>

      {utangMessage && (
        <div className="alert-success" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✓ {utangMessage}</span>
          <button className="btn btn-sm btn-secondary" onClick={() => setUtangMessage(null)}>Dismiss</button>
        </div>
      )}

      {/* Add Utang Form */}
      {showAddUtang && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid var(--primary)', animation: 'slideDown 0.3s ease' }}>
          <h3 style={{ marginTop: 0, marginBottom: 14 }}>📝 Add Utang Item for {customer?.name}</h3>
          <form onSubmit={handleAddUtang}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Select Store Product</label>
                <select className="form-select" value={selectedProductId} onChange={e => handleProductSelect(e.target.value)}>
                  <option value="">Select product or type custom item below...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — ₱{Number(p.selling_price).toFixed(2)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Item / Product Name</label>
                <input 
                  className="form-input" 
                  placeholder="e.g. 1.5L Coke or 3 Cans Sardines" 
                  value={customItemName} 
                  onChange={e => setCustomItemName(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Quantity</label>
                <input 
                  className="form-input" 
                  type="number" 
                  min="1" 
                  value={utangQty} 
                  onChange={e => setUtangQty(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Price per Item (₱)</label>
                <input 
                  className="form-input" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  placeholder="0.00" 
                  value={utangPrice} 
                  onChange={e => setUtangPrice(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Total Utang Charge</label>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#f87171', paddingTop: '6px' }}>
                  ₱{((Number(utangQty) || 1) * (Number(utangPrice) || 0)).toFixed(2)}
                </div>
              </div>
            </div>

            <button className="btn btn-primary" type="submit">✦ Save Utang Charge</button>
          </form>
        </div>
      )}

      {/* Profile & Financial Summary Grid */}
      {customer && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '24px', marginBottom: '24px' }}>
          {/* Customer Profile Card */}
          <div className="card" style={{ padding: '22px' }}>
            <h3 style={{ marginBottom: '14px' }}>Customer Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone</span>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{customer.phone || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Address</span>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{customer.address || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Credit Rating</span>
                <div style={{ marginTop: '4px' }}>
                  <StatusBadge status={balance > 300 ? 'warning' : 'good'} />
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="card" style={{ padding: '22px' }}>
            <h3 style={{ marginBottom: '14px' }}>Financial Balance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '12px' }}>
              <div style={{ padding: '14px', background: 'rgba(239,68,68,0.08)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#f87171', fontWeight: '700', textTransform: 'uppercase' }}>Total Utang</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#f87171', marginTop: '4px' }}>₱{displayOwed.toFixed(2)}</div>
              </div>

              <div style={{ padding: '14px', background: 'rgba(34,197,94,0.08)', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: '700', textTransform: 'uppercase' }}>Total Paid</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#4ade80', marginTop: '4px' }}>₱{paid.toFixed(2)}</div>
              </div>

              <div style={{ padding: '14px', background: balance > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)', borderRadius: '10px', border: `1px solid ${balance > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}`, textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: balance > 0 ? '#fbbf24' : '#4ade80', fontWeight: '700', textTransform: 'uppercase' }}>Balance Due</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: balance > 0 ? 'var(--gold-300)' : '#4ade80', marginTop: '4px' }}>
                  {balance > 0 ? `₱${balance.toFixed(2)}` : '₱0.00'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Utang Items Table */}
      <div className="card table-container" style={{ marginBottom: 24, padding: '22px' }}>
        <h3 style={{ marginBottom: 16 }}>📦 Items Taken on Credit (Utang)</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice / Ref #</th>
              <th>Item / Product Name</th>
              <th style={{ textAlign: 'center' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Total Utang</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No utang items recorded yet. Click "Add New Utang Item" above to add.
                </td>
              </tr>
            ) : (
              sales.map(s => {
                const firstItem = s.items && s.items.length > 0 ? s.items[0] : null;
                const itemName = firstItem ? (firstItem.product_name || firstItem.name || 'Utang Item') : 'Utang Purchase';
                const itemQty = firstItem ? firstItem.quantity : 1;

                return (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(s.created_at || s.date || Date.now()).toLocaleDateString()}</td>
                    <td><span style={{ fontWeight: '700', color: 'var(--gold-200)' }}>{s.invoice_no}</span></td>
                    <td style={{ fontWeight: '600' }}>{itemName}</td>
                    <td style={{ textAlign: 'center' }}>{itemQty}</td>
                    <td style={{ textAlign: 'right', color: '#f87171', fontWeight: '700' }}>₱{Number(s.total_amount).toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <Link to={`/receipt?id=${s.id}`} className="btn btn-sm btn-secondary">View Receipt</Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Payments History Table */}
      <div className="card table-container" style={{ padding: '22px' }}>
        <h3 style={{ marginBottom: 16 }}>💵 Payment History</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Payment Ref</th>
              <th style={{ textAlign: 'right' }}>Amount Paid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No payments recorded yet.
                </td>
              </tr>
            ) : (
              payments.map(p => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--text-secondary)' }}>{new Date(p.payment_date || p.created_at || Date.now()).toLocaleDateString()}</td>
                  <td style={{ fontWeight: '700', color: 'var(--gold-200)' }}>PAY-{p.id}</td>
                  <td style={{ textAlign: 'right', color: '#4ade80', fontWeight: '800' }}>₱{Number(p.amount).toFixed(2)}</td>
                  <td><span className="badge status-success">Completed</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
