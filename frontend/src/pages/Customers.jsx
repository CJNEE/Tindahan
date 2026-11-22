import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddUtang, setShowAddUtang] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Customer form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Utang form
  const [utangCustomer, setUtangCustomer] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [utangQty, setUtangQty] = useState(1);
  const [utangPrice, setUtangPrice] = useState('');
  const [utangSuccess, setUtangSuccess] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setLoading(true);
    const storedCustomers = JSON.parse(localStorage.getItem('sari_local_customers') || '[]');
    const storedPays = JSON.parse(localStorage.getItem('sari_local_payments') || '[]');
    const localSales = JSON.parse(localStorage.getItem('sari_local_sales') || '[]');

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
      .catch(() => setCustomers(storedCustomers.length > 0 ? storedCustomers : FALLBACK_CUSTOMERS));

    api.get('/products/')
      .then(r => setProducts(r.data && r.data.length ? r.data : FALLBACK_PRODUCTS))
      .catch(() => setProducts(FALLBACK_PRODUCTS));

    api.get('/payments/')
      .then(r => {
        const apiPays = r.data || [];
        const payMap = new Map(apiPays.map(p => [String(p.id), p]));
        storedPays.forEach(p => { if (!payMap.has(String(p.id))) payMap.set(String(p.id), p); });
        const mergedPays = Array.from(payMap.values());
        setPayments(mergedPays);
        localStorage.setItem('sari_local_payments', JSON.stringify(mergedPays));
      })
      .catch(() => setPayments(storedPays));

    api.get('/sales/')
      .then(r => {
        const apiData = r.data || [];
        const map = new Map(apiData.map(s => [s.id || s.invoice_no, s]));
        localSales.forEach(s => { if (!map.has(s.id || s.invoice_no)) map.set(s.id || s.invoice_no, s); });
        setSales(Array.from(map.values()));
      })
      .catch(() => setSales(localSales))
      .finally(() => setLoading(false));
  }

  async function createCustomer(e) {
    e.preventDefault();
    if (!name) return;
    const newCust = { 
      name, 
      phone, 
      address, 
      username: newUsername || (phone ? phone : name.toLowerCase().replace(/\s+/g, '_')),
      password: newPassword || 'password123',
      credit_status: 'good', 
      utang: 0 
    };
    try {
      const res = await api.post('/customers/', newCust);
      if (res.data) setCustomers(prev => [res.data, ...prev]);
    } catch(err) {
      console.warn(err);
      setCustomers(prev => [{ id: Date.now(), ...newCust }, ...prev]);
    }
    setName('');
    setPhone('');
    setAddress('');
    setNewUsername('');
    setNewPassword('');
    setShowAddCustomer(false);
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

  async function createUtang(e) {
    e.preventDefault();
    if (!utangCustomer || (!customItemName && !selectedProductId) || !utangPrice) return;

    const qty = Number(utangQty) || 1;
    const price = Number(utangPrice) || 0;
    const totalAmount = qty * price;
    const invoiceNo = 'UTANG-' + Math.floor(100000 + Math.random() * 900000);
    const itemName = customItemName || 'Utang Item';

    const selectedCust = customers.find(c => String(c.id) === String(utangCustomer));
    const custName = selectedCust ? selectedCust.name : 'Customer';

    const utangSale = {
      id: Date.now(),
      invoice_no: invoiceNo,
      customer: !isNaN(Number(utangCustomer)) ? Number(utangCustomer) : utangCustomer,
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
      console.warn('Error saving utang to API:', err);
    }

    const storedSales = JSON.parse(localStorage.getItem('sari_local_sales') || '[]');
    localStorage.setItem('sari_local_sales', JSON.stringify([utangSale, ...storedSales]));
    setSales(prev => [utangSale, ...prev]);

    setUtangSuccess({ customerName: custName, itemName, totalAmount, invoiceNo });
    setUtangCustomer('');
    setSelectedProductId('');
    setCustomItemName('');
    setUtangQty(1);
    setUtangPrice('');
    setShowAddUtang(false);
  }

  async function removeCustomer(id) {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await api.delete(`/customers/${id}/`);
    } catch(err) {}
    setCustomers(prev => prev.filter(c => String(c.id) !== String(id)));
  }

  function getCustomerUtangBalance(c) {
    const custSales = sales.filter(s => (String(s.customer) === String(c.id) || (String(c.id) === '1' && String(s.customer) === 'f1')) && s.type === 'utang');
    const salesTotal = custSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const initialUtang = salesTotal > 0 
      ? salesTotal 
      : (c.total_utang !== undefined ? Number(c.total_utang) : (c.utang !== undefined ? Number(c.utang) : (c.utang_balance !== undefined ? Number(c.utang_balance) : 0)));

    const custPayments = payments.filter(p => 
      String(p.customer_id) === String(c.id) || 
      String(p.customer) === String(c.id) ||
      (String(c.id) === '1' && (String(p.customer) === 'f1' || String(p.customer_id) === 'f1')) ||
      (String(c.id) === 'f1' && (String(p.customer) === '1' || String(p.customer_id) === '1'))
    );
    const paidTotal = custPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const netBal = initialUtang - paidTotal;
    return netBal > 0 ? netBal : 0;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>👥 Customers & Utang Records</h2>
          <p>Customer accounts, credit limits, and utang tracking with payments</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => { setShowAddUtang(!showAddUtang); setShowAddCustomer(false); }}
          >
            {showAddUtang ? '✕ Cancel' : '📝 Record New Utang'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => { setShowAddCustomer(!showAddCustomer); setShowAddUtang(false); }}
          >
            {showAddCustomer ? '✕ Cancel' : '➕ Add Customer'}
          </button>
        </div>
      </div>

      {utangSuccess && (
        <div className="alert-success" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>✓ Utang Recorded:</strong> Added <strong>{utangSuccess.itemName}</strong> (₱{utangSuccess.totalAmount.toFixed(2)}) for <strong>{utangSuccess.customerName}</strong>.
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => setUtangSuccess(null)}>Dismiss</button>
        </div>
      )}

      {/* Record New Utang Form */}
      {showAddUtang && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid var(--primary)', animation: 'slideDown 0.3s ease' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>📝 Record New Utang (Credit Purchase)</h3>
          <form onSubmit={createUtang}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Select Customer</label>
              <select 
                className="form-select" 
                value={utangCustomer} 
                onChange={e => setUtangCustomer(e.target.value)} 
                required
              >
                <option value="">Choose a customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                ))}
              </select>
            </div>

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
                  placeholder="e.g. Coca-Cola 1.5L or 2 packs noodles" 
                  value={customItemName} 
                  onChange={e => setCustomItemName(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: 18 }}>
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
                <label className="form-label">Price per Unit (₱)</label>
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
                <label className="form-label">Total Charge</label>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#f87171', paddingTop: '6px' }}>
                  ₱{((Number(utangQty) || 1) * (Number(utangPrice) || 0)).toFixed(2)}
                </div>
              </div>
            </div>

            <button className="btn btn-primary" type="submit">✦ Save Utang Entry</button>
          </form>
        </div>
      )}

      {/* Add New Customer Form */}
      {showAddCustomer && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid var(--border-gold)', animation: 'slideDown 0.3s ease' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>➕ Add New Customer & Member Account</h3>
          <form onSubmit={createCustomer}>
            <div className="form-group form-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.5fr', gap: '14px', marginBottom: 14 }}>
              <div>
                <label className="form-label">Full Name *</label>
                <input 
                  className="form-input" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Maria Santos"
                  required 
                />
              </div>
              <div>
                <label className="form-label">Phone Number</label>
                <input 
                  className="form-input" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="0917-xxx-xxxx"
                />
              </div>
              <div>
                <label className="form-label">Address / Purok</label>
                <input 
                  className="form-input" 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  placeholder="e.g. Purok 4, Brgy. Poblacion"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: 16 }}>
              <div>
                <label className="form-label">Member Login Username (Optional)</label>
                <input 
                  className="form-input" 
                  value={newUsername} 
                  onChange={e => setNewUsername(e.target.value)} 
                  placeholder="Leave empty to use phone or name"
                />
              </div>
              <div>
                <label className="form-label">Member Password (Optional)</label>
                <input 
                  type="password"
                  className="form-input" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  placeholder="Default: password123"
                />
              </div>
            </div>

            <button className="btn btn-primary" type="submit">✓ Create Customer & Member Account</button>
          </form>
        </div>
      )}

      {/* Customer List */}
      <div className="card table-container">
        {/* Search + Status Filter Toolbar */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '14px' }}>🔍</span>
            <input
              type="text"
              className="form-input"
              placeholder="Search customer name or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px', height: '42px' }}
            />
          </div>
          <select
            className="form-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ width: '185px', height: '42px' }}
          >
            <option value="all">👥 All Customers</option>
            <option value="good">✅ Good Standing (₱0)</option>
            <option value="hasutang">⚠️ Has Utang</option>
            <option value="high">🔴 High Balance (&gt;₱300)</option>
          </select>
        </div>
        {loading ? (
          <div className="loading-spinner"></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Customer / Suki Member</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Utang Balance</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.filter(c => {
                const q = searchTerm.toLowerCase();
                const matchesSearch = c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q));
                const bal = getCustomerUtangBalance(c);
                const matchesStatus =
                  statusFilter === 'all' ? true :
                  statusFilter === 'good' ? bal === 0 :
                  statusFilter === 'hasutang' ? bal > 0 :
                  statusFilter === 'high' ? bal > 300 : true;
                return matchesSearch && matchesStatus;
              }).map(c => {
                const utangBal = getCustomerUtangBalance(c);
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {c.image_data ? (
                          <img 
                            src={c.image_data} 
                            alt={c.name} 
                            style={{ 
                              width: '36px', 
                              height: '36px', 
                              borderRadius: '50%', 
                              objectFit: 'cover', 
                              border: '2px solid var(--crimson)',
                              boxShadow: '0 2px 8px var(--crimson-glow)',
                              flexShrink: 0
                            }} 
                          />
                        ) : (
                          <div 
                            style={{ 
                              width: '36px', 
                              height: '36px', 
                              borderRadius: '50%', 
                              background: 'var(--gradient-crimson)', 
                              color: '#fff', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontSize: '14px', 
                              fontWeight: '800',
                              flexShrink: 0,
                              boxShadow: '0 2px 8px var(--crimson-glow)'
                            }}
                          >
                            {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                        )}
                        <div>
                          <Link 
                            to={`/customers/${c.id}`} 
                            style={{ fontWeight: '700', color: 'var(--gold-200)', textDecoration: 'none', display: 'block' }}
                          >
                            {c.name}
                          </Link>
                          {c.username && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              @{c.username}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.phone || 'N/A'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.address || 'N/A'}</td>
                    <td style={{ color: utangBal > 0 ? 'var(--crimson)' : '#22c55e', fontWeight: '800' }}>
                      {utangBal > 0 ? `₱${utangBal.toFixed(2)}` : '₱0.00 (Paid)'}
                    </td>
                    <td>
                      <StatusBadge status={utangBal > 300 ? 'warning' : 'good'} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link 
                        to={`/customers/${c.id}`} 
                        className="btn btn-sm btn-secondary" 
                        style={{ marginRight: 8, borderColor: 'var(--border-gold)', color: 'var(--gold-300)' }}
                      >
                        Profile & Ledger
                      </Link>
                      <button className="btn btn-sm btn-danger" onClick={() => removeCustomer(c.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {customers.filter(c => {
                const q = searchTerm.toLowerCase();
                const matchesSearch = c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q));
                const bal = getCustomerUtangBalance(c);
                const matchesStatus =
                  statusFilter === 'all' ? true :
                  statusFilter === 'good' ? bal === 0 :
                  statusFilter === 'hasutang' ? bal > 0 :
                  statusFilter === 'high' ? bal > 300 : true;
                return matchesSearch && matchesStatus;
              }).length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    {customers.length === 0 ? 'No customer records found.' : 'No customers match your search or filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
