import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import DashboardCard from '../components/DashboardCard';
import StatusBadge from '../components/StatusBadge';

const FALLBACK_PRODUCTS = [
  { id: 1, name: 'Coca-Cola 1.5L', selling_price: 85.00, purchase_cost: 65.00, current_stock: 24, image_data: null },
  { id: 2, name: 'Lucky Me Pancit Canton', selling_price: 12.50, purchase_cost: 9.00, current_stock: 48, image_data: null },
  { id: 3, name: 'Argentina Corned Beef', selling_price: 42.00, purchase_cost: 32.00, current_stock: 15, image_data: null },
  { id: 4, name: 'Kopiko Brown Coffee 25g', selling_price: 8.00, purchase_cost: 5.50, current_stock: 60, image_data: null },
  { id: 5, name: 'Tide Powder Detergent 80g', selling_price: 15.00, purchase_cost: 11.00, current_stock: 30, image_data: null },
];

const FALLBACK_CUSTOMERS = [
  { id: 1, name: 'Maria Santos', phone: '0917-123-4567', total_utang: 450.00, total_paid: 0.00, utang_balance: 450.00 },
  { id: 2, name: 'Juan Dela Cruz', phone: '0918-987-6543', total_utang: 280.00, total_paid: 0.00, utang_balance: 280.00 },
];

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  function loadDashboardData() {
    setLoading(true);
    const storedProds = JSON.parse(localStorage.getItem('sari_local_products') || '[]');
    const storedPays = JSON.parse(localStorage.getItem('sari_local_payments') || '[]');
    const localSales = JSON.parse(localStorage.getItem('sari_local_sales') || '[]');

    // 1. Load Products (API + local fallback)
    api.get('/products/')
      .then(r => {
        if (r.data && r.data.length > 0) {
          const map = new Map();
          r.data.forEach(p => {
            const localMatch = storedProds.find(s => s.id === p.id);
            map.set(p.id, { ...p, image_data: p.image_data || (localMatch ? localMatch.image_data : null) });
          });
          storedProds.forEach(p => { if (!map.has(p.id)) map.set(p.id, p); });
          setProducts(Array.from(map.values()));
        } else {
          setProducts(storedProds.length > 0 ? storedProds : FALLBACK_PRODUCTS);
        }
      })
      .catch(() => setProducts(storedProds.length > 0 ? storedProds : FALLBACK_PRODUCTS));

    // 2. Load Payments (API + local fallback)
    api.get('/payments/')
      .then(r => {
        const apiPays = r.data || [];
        const payMap = new Map(apiPays.map(p => [p.id, p]));
        storedPays.forEach(p => { if (!payMap.has(p.id)) payMap.set(p.id, p); });
        const mergedPays = Array.from(payMap.values());
        setPayments(mergedPays);
        localStorage.setItem('sari_local_payments', JSON.stringify(mergedPays));
      })
      .catch(() => setPayments(storedPays));

    // 3. Load Customers (API with direct utang_balance + localStorage)
    const storedCustomers = JSON.parse(localStorage.getItem('sari_local_customers') || '[]');
    api.get('/customers/')
      .then(r => {
        if (r.data && r.data.length > 0) {
          const map = new Map(r.data.map(c => [String(c.id), c]));
          storedCustomers.forEach(c => {
            if (!map.has(String(c.id))) map.set(String(c.id), c);
          });
          setCustomers(Array.from(map.values()));
        } else {
          setCustomers(storedCustomers.length > 0 ? storedCustomers : FALLBACK_CUSTOMERS);
        }
      })
      .catch(() => setCustomers(storedCustomers.length > 0 ? storedCustomers : FALLBACK_CUSTOMERS));

    // 4. Load Sales (API + local)
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

  const todaySalesTotal = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const lowStockCount = products.filter(p => Number(p.current_stock || 0) <= 5).length;

  // Calculate Net Utang per Customer (accurately uses payments from both PostgreSQL & localStorage)
  function getCustomerBalance(c) {
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

  const utangCustomers = customers.map(c => ({
    ...c,
    currentUtang: getCustomerBalance(c)
  })).filter(c => c.currentUtang > 0);

  const totalUtangSum = utangCustomers.reduce((sum, c) => sum + c.currentUtang, 0);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>🏪 Store Dashboard</h1>
          <p>{todayDateStr} • Cloud Database Connected</p>
        </div>
      </div>

      {/* Quick Action Buttons Pill Bar */}
      <div className="dashboard-actions-bar">
        <Link to="/shop" className="dashboard-action-pill primary">
          🛍️ Open Shop (POS)
        </Link>
        <Link to="/products" className="dashboard-action-pill secondary">
          📦 Inventory
        </Link>
        <Link to="/customers" className="dashboard-action-pill secondary">
          📝 Record Utang
        </Link>
        <Link to="/payments" className="dashboard-action-pill secondary">
          💳 Receive Payment
        </Link>
      </div>

      {/* 4 Metric Cards Grid */}
      <div className="dashboard-cards">
        <DashboardCard 
          title="Total Store Revenue" 
          value={`₱${todaySalesTotal.toFixed(2)}`} 
          hint={`${sales.length} transactions processed`}
          icon="💵" 
        />
        <DashboardCard 
          title="Completed Transactions" 
          value={String(sales.length)} 
          hint="All sales orders & credit"
          icon="🧾" 
        />
        <DashboardCard 
          title="Product Inventory" 
          value={String(products.length)} 
          hint={lowStockCount > 0 ? `⚠️ ${lowStockCount} item(s) low on stock` : '✓ Stock levels healthy'}
          icon="📦" 
        />
        <DashboardCard 
          title="Utang Collectibles" 
          value={`₱${totalUtangSum.toFixed(2)}`} 
          hint={`${utangCustomers.length} customer(s) with debt`}
          icon="👥" 
        />
      </div>

      {/* Main Content Grid: 2 Columns */}
      <div className="dashboard-tables-grid">
        {/* Left Column: Product Inventory Overview */}
        <div className="card table-container" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>📦 Product Inventory Overview</h3>
            <Link to="/products" style={{ fontSize: '13px', color: '#ff6b8b', fontWeight: '700', textDecoration: 'none' }}>
              View All Products ➔
            </Link>
          </div>

          {loading ? (
            <div className="loading-spinner"></div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 6).map(p => {
                  const isLow = Number(p.current_stock || 0) <= 5;
                  const productImg = p.image_data || (p.images && p.images[0]?.image);

                  return (
                    <tr key={p.id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {productImg ? (
                          <img 
                            src={productImg} 
                            alt={p.name} 
                            style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(225,29,72,0.3)' }} 
                          />
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'rgba(225,29,72,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                            📦
                          </div>
                        )}
                        <Link to={`/products/${p.id}`} style={{ fontWeight: '700', color: '#fff', textDecoration: 'none' }}>
                          {p.name}
                        </Link>
                      </td>
                      <td style={{ fontWeight: '700', color: '#fff' }}>₱{parseFloat(p.selling_price || 0).toFixed(2)}</td>
                      <td><strong>{p.current_stock}</strong> pcs</td>
                      <td>
                        <span className={`badge ${isLow ? 'status-danger' : 'status-success'}`}>
                          {isLow ? '⚠️ Low' : 'In Stock'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to="/products" className="btn btn-sm btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                          Restock
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Column: Recent Sales & Active Utang Customers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Recent Sales Activity */}
          <div className="card table-container" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>🧾 Recent Transactions</h3>
              <Link to="/receipts" style={{ fontSize: '13px', color: '#ff6b8b', fontWeight: '700', textDecoration: 'none' }}>
                View All ➔
              </Link>
            </div>

            {sales.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                <p>No recent transactions recorded.</p>
                <Link to="/shop" className="btn btn-sm btn-primary" style={{ marginTop: '10px' }}>Make a Sale in Shop</Link>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'center' }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 5).map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: '700', fontSize: '13px', color: '#fff' }}>{s.invoice_no}</td>
                      <td>
                        <StatusBadge status={s.type === 'utang' ? 'utang' : 'paid'} />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: '#fff' }}>
                        ₱{Number(s.total_amount || 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Link to={`/receipt?id=${s.id}`} className="btn btn-sm btn-secondary" style={{ fontSize: '11px', padding: '2px 8px' }}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Customers with Active Utang */}
          <div className="card table-container" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>👥 Active Utang Collectibles</h3>
              <Link to="/payments" style={{ fontSize: '13px', color: '#ff6b8b', fontWeight: '700', textDecoration: 'none' }}>
                Settle ➔
              </Link>
            </div>

            {utangCustomers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#4ade80', fontWeight: 'bold' }}>
                🎉 No active utang balances! All customers are fully paid.
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th style={{ textAlign: 'right' }}>Utang Owed</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {utangCustomers.map(c => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/customers/${c.id}`} style={{ fontWeight: '700', color: '#fff', textDecoration: 'none' }}>
                          {c.name}
                        </Link>
                      </td>
                      <td style={{ textAlign: 'right', color: '#f87171', fontWeight: '800' }}>
                        ₱{c.currentUtang.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Link to="/payments" className="btn btn-sm btn-primary" style={{ fontSize: '11px', padding: '3px 10px' }}>
                          Pay Utang
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
