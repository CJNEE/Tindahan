import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';

export default function MemberPortal() {
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'utang' | 'payments'

  // Editable Profile fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  // Selected receipt modal
  const [selectedReceiptSale, setSelectedReceiptSale] = useState(null);

  useEffect(() => {
    loadMemberData();
  }, []);

  function loadMemberData() {
    setLoading(true);

    // Retrieve active logged-in member from storage
    const rawStoredMember = localStorage.getItem('sari_member');
    let currentMember = null;
    if (rawStoredMember) {
      try {
        currentMember = JSON.parse(rawStoredMember);
      } catch (e) {
        currentMember = null;
      }
    }

    // If no member is saved, check fallback customer id 1 (Maria Santos) for convenience
    if (!currentMember) {
      const storedCustomers = JSON.parse(localStorage.getItem('sari_local_customers') || '[]');
      currentMember = storedCustomers[0] || {
        id: 1,
        name: 'Maria Santos',
        phone: '0917-123-4567',
        address: 'Brgy. San Antonio',
        credit_status: 'good',
        username: 'maria',
        total_utang: 450.0,
        total_paid: 0.0,
        utang_balance: 450.0
      };
    }

    setMember(currentMember);
    setEditName(currentMember.name || '');
    setEditPhone(currentMember.phone || '');
    setEditAddress(currentMember.address || '');
    setEditEmail(currentMember.email || '');
    setPreviewImage(currentMember.image_data || '');

    const memberId = currentMember.id;

    // Load fresh data from API or localStorage
    const localSales = JSON.parse(localStorage.getItem('sari_local_sales') || '[]');
    const storedPays = JSON.parse(localStorage.getItem('sari_local_payments') || '[]');

    // Fetch customer details from backend if available
    api.get(`/customers/${memberId}/`)
      .then(r => {
        if (r.data) {
          setMember(r.data);
          localStorage.setItem('sari_member', JSON.stringify(r.data));
          setEditName(r.data.name || '');
          setEditPhone(r.data.phone || '');
          setEditAddress(r.data.address || '');
          setEditEmail(r.data.email || '');
          setPreviewImage(r.data.image_data || '');
        }
      })
      .catch(() => {
        // Keep current cached member
      });

    // Fetch Utang Sales for this member
    api.get('/sales/')
      .then(r => {
        const apiSales = (r.data || []).filter(s => 
          String(s.customer) === String(memberId) ||
          (String(memberId) === '1' && String(s.customer) === 'f1')
        );
        const map = new Map(apiSales.map(s => [s.id || s.invoice_no, s]));
        localSales.filter(s => 
          String(s.customer) === String(memberId) ||
          (String(memberId) === '1' && String(s.customer) === 'f1')
        ).forEach(s => {
          const key = s.id || s.invoice_no;
          if (!map.has(key)) map.set(key, s);
        });
        setSales(Array.from(map.values()));
      })
      .catch(() => {
        setSales(localSales.filter(s => 
          String(s.customer) === String(memberId) ||
          (String(memberId) === '1' && String(s.customer) === 'f1')
        ));
      });

    // Fetch Payment History for this member
    api.get('/payments/')
      .then(r => {
        const apiPays = r.data || [];
        const payMap = new Map(apiPays.map(p => [String(p.id), p]));
        storedPays.forEach(p => { if (!payMap.has(String(p.id))) payMap.set(String(p.id), p); });
        const allPays = Array.from(payMap.values());
        const custPays = allPays.filter(p => 
          String(p.customer_id) === String(memberId) || 
          String(p.customer) === String(memberId) ||
          (String(memberId) === '1' && (String(p.customer) === 'f1' || String(p.customer_id) === 'f1'))
        );
        setPayments(custPays);
      })
      .catch(() => {
        const custPays = storedPays.filter(p => 
          String(p.customer_id) === String(memberId) || 
          String(p.customer) === String(memberId) ||
          (String(memberId) === '1' && (String(p.customer) === 'f1' || String(p.customer_id) === 'f1'))
        );
        setPayments(custPays);
      })
      .finally(() => setLoading(false));
  }

  // Calculate totals
  const utangSales = sales.filter(s => s.type === 'utang');
  const totalUtangAmount = utangSales.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);
  const totalPaidAmount = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const currentUtangBalance = Math.max(0, totalUtangAmount - totalPaidAmount);

  // Handle Photo File Upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      setPreviewImage(base64Data);
    };
    reader.readAsDataURL(file);
  };

  // Handle Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName) {
      alert('Name is required.');
      return;
    }

    setSavingProfile(true);
    setSaveMessage(null);

    const updatedData = {
      ...member,
      name: editName,
      phone: editPhone,
      address: editAddress,
      email: editEmail,
      image_data: previewImage,
    };

    if (editPassword) {
      updatedData.password = editPassword;
    }

    try {
      if (member?.id) {
        await api.post(`/customers/${member.id}/update-profile/`, updatedData);
      }
    } catch (err) {
      console.warn('API update failed, updating local copy:', err);
    }

    // Update localStorage
    setMember(updatedData);
    localStorage.setItem('sari_member', JSON.stringify(updatedData));

    // Also update in sari_local_customers so store admin sees the changes too!
    const storedCustomers = JSON.parse(localStorage.getItem('sari_local_customers') || '[]');
    const updatedList = storedCustomers.map(c => 
      String(c.id) === String(member?.id) ? { ...c, ...updatedData } : c
    );
    localStorage.setItem('sari_local_customers', JSON.stringify(updatedList));

    setSavingProfile(false);
    setSaveMessage('Your personal information and profile image have been updated successfully! ✨');
    setEditPassword('');
    setTimeout(() => setSaveMessage(null), 5000);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('sari_member');
    localStorage.removeItem('sari_role');
    navigate('/login');
    window.location.reload();
  };

  if (loading && !member) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="loading-spinner"></div>
        <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>Loading your member portal...</p>
      </div>
    );
  }

  return (
    <div className="member-portal-wrapper">
      {/* Top Welcome Banner */}
      <div className="member-welcome-banner">
        <div className="member-welcome-left">
          <div className="member-avatar-wrap">
            {previewImage || member?.image_data ? (
              <img 
                src={previewImage || member?.image_data} 
                alt={member?.name} 
                className="member-avatar-img"
              />
            ) : (
              <div className="member-avatar-placeholder">
                {member?.name ? member.name.charAt(0).toUpperCase() : 'M'}
              </div>
            )}
          </div>
          <div className="member-welcome-text">
            <h2>Kumusta, {member?.name || 'Suki Member'}! 👋</h2>
            <p>Welcome to your personal Suki Account Portal • Recorded & Verified by Shella Sari-Sari Store</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Account Type</span>
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--crimson)' }}>⭐ Verified Member</span>
          </div>
          <button 
            className="sidebar-logout-btn" 
            onClick={handleLogout}
            title="Log out from your member account"
          >
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Cards ("How much utang they had") */}
      <div className="dashboard-cards" style={{ marginBottom: 0 }}>
        {/* Card 1: Remaining Utang Balance */}
        <div 
          className="dashboard-stat-card" 
          style={{ 
            borderLeft: `5px solid ${currentUtangBalance > 0 ? 'var(--crimson)' : '#22c55e'}`
          }}
        >
          <div>
            <div className="stat-title">Current Utang Balance</div>
            <div 
              className="stat-value" 
              style={{ color: currentUtangBalance > 0 ? 'var(--crimson)' : '#22c55e' }}
            >
              ₱{currentUtangBalance.toFixed(2)}
            </div>
          </div>
          <div className="stat-hint">
            {currentUtangBalance > 0 ? (
              <span className="badge status-danger">⚠️ Unpaid Balance</span>
            ) : (
              <span className="badge status-success">✅ Walang Utang (Fully Paid)</span>
            )}
          </div>
        </div>

        {/* Card 2: Total Utang Ever Recorded */}
        <div 
          className="dashboard-stat-card" 
          style={{ borderLeft: '5px solid #f59e0b' }}
        >
          <div>
            <div className="stat-title">Total Utang Recorded</div>
            <div className="stat-value" style={{ color: 'var(--gold-300)' }}>
              ₱{totalUtangAmount.toFixed(2)}
            </div>
          </div>
          <div className="stat-hint">
            <span>All credit purchases by store</span>
          </div>
        </div>

        {/* Card 3: Total Payments Logged by Owner */}
        <div 
          className="dashboard-stat-card" 
          style={{ borderLeft: '5px solid #22c55e' }}
        >
          <div>
            <div className="stat-title">Total Payments Made</div>
            <div className="stat-value" style={{ color: '#22c55e' }}>
              ₱{totalPaidAmount.toFixed(2)}
            </div>
          </div>
          <div className="stat-hint">
            <span>Verified by Store Owner/Admin</span>
          </div>
        </div>

        {/* Card 4: Store Credit Rating */}
        <div 
          className="dashboard-stat-card" 
          style={{ borderLeft: '5px solid #3b82f6' }}
        >
          <div>
            <div className="stat-title">Suki Credit Standing</div>
            <div style={{ marginTop: '10px' }}>
              <StatusBadge status={member?.credit_status || 'good'} />
            </div>
          </div>
          <div className="stat-hint" style={{ marginTop: '14px' }}>
            <span>Verified Customer #{member?.id || 1}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="member-tabs-bar">
        <button 
          className={`member-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <span>👤</span>
          <span>Personal Info & Profile Photo</span>
        </button>

        <button 
          className={`member-tab-btn ${activeTab === 'utang' ? 'active' : ''}`}
          onClick={() => setActiveTab('utang')}
        >
          <span>🛍️</span>
          <span>Utang History ({utangSales.length})</span>
        </button>

        <button 
          className={`member-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <span>💳</span>
          <span>Payment History ({payments.length})</span>
        </button>
      </div>

      {/* Save feedback banner */}
      {saveMessage && (
        <div className="alert-success" style={{ animation: 'fadeIn 0.3s ease' }}>
          {saveMessage}
        </div>
      )}

      {/* ── TAB 1: PERSONAL INFO & PHOTO EDITING ── */}
      {activeTab === 'info' && (
        <div className="member-info-grid">
          {/* Photo Card */}
          <div className="member-photo-card">
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '14px', color: 'var(--text)' }}>
              Profile Photo
            </h3>

            {previewImage || member?.image_data ? (
              <img 
                src={previewImage || member?.image_data} 
                alt="Member Avatar" 
                className="member-photo-large"
              />
            ) : (
              <div className="member-photo-placeholder-large">
                {member?.name ? member.name.charAt(0).toUpperCase() : 'M'}
              </div>
            )}

            <label className="member-upload-trigger-btn">
              <span>📷</span>
              <span>{previewImage ? 'Change Image' : 'Add Profile Image'}</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
                style={{ display: 'none' }} 
              />
            </label>

            {previewImage && (
              <button 
                type="button" 
                onClick={() => setPreviewImage('')} 
                style={{ 
                  marginTop: '10px', 
                  fontSize: '12px', 
                  color: 'var(--danger-color)', 
                  fontWeight: '600',
                  textDecoration: 'underline' 
                }}
              >
                Remove Photo
              </button>
            )}

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px', lineHeight: '1.4' }}>
              Upload any JPG or PNG photo. It will be displayed on your account and visible on the store records.
            </p>
          </div>

          {/* Personal Info Form */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', margin: 0 }}>
                  Edit Personal Information
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Update your contact details anytime to keep store records accurate.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input 
                    className="form-input" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    placeholder="e.g. Maria Santos"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input 
                    className="form-input" 
                    value={editPhone} 
                    onChange={e => setEditPhone(e.target.value)} 
                    placeholder="e.g. 0917-123-4567"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Complete Address</label>
                <input 
                  className="form-input" 
                  value={editAddress} 
                  onChange={e => setEditAddress(e.target.value)} 
                  placeholder="e.g. Purok 3, Brgy. San Antonio, Manila"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Email Address (Optional)</label>
                  <input 
                    type="email"
                    className="form-input" 
                    value={editEmail} 
                    onChange={e => setEditEmail(e.target.value)} 
                    placeholder="e.g. maria@gmail.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Change Password (Optional)</label>
                  <input 
                    type="password"
                    className="form-input" 
                    value={editPassword} 
                    onChange={e => setEditPassword(e.target.value)} 
                    placeholder="Leave blank to keep current"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={savingProfile}
                  style={{ minWidth: '160px', padding: '12px 24px' }}
                >
                  {savingProfile ? 'Saving Changes...' : '💾 Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB 2: UTANG HISTORY (READ-ONLY DISPLAYING) ── */}
      {activeTab === 'utang' && (
        <div className="card table-container" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text)' }}>
                🛍️ Utang History Log
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Official list of all items and credit purchases recorded by store cashier/admin.
              </p>
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--crimson)' }}>
              Total: ₱{totalUtangAmount.toFixed(2)}
            </div>
          </div>

          {utangSales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎉</div>
              <h4 style={{ color: 'var(--text)', marginBottom: '4px' }}>No Utang Records Found!</h4>
              <p>You currently do not have any credit records on file.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Invoice #</th>
                  <th>Purchased Item(s)</th>
                  <th>Cashier</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {utangSales.map(s => {
                  const itemsText = (s.items && s.items.length) 
                    ? s.items.map(it => `${it.quantity || 1}x ${it.product_name || it.name || 'Item'}`).join(', ')
                    : 'Store Credit Purchase';
                  const dateStr = new Date(s.created_at || s.date || Date.now()).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={s.id || s.invoice_no}>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                        {dateStr}
                      </td>
                      <td>
                        <span style={{ fontWeight: '800', color: 'var(--gold-200)' }}>
                          {s.invoice_no}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600', color: 'var(--text)' }}>
                        {itemsText}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        {s.cashier || 'Admin'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--crimson)' }}>
                        ₱{Number(s.total_amount || 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedReceiptSale(s)}
                          style={{ borderColor: 'var(--border-gold)', color: 'var(--gold-300)' }}
                        >
                          🧾 View Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── TAB 3: PAYMENT HISTORY (READ-ONLY DISPLAYING) ── */}
      {activeTab === 'payments' && (
        <div className="card table-container" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text)' }}>
                💳 Payment History Log
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                All payments recorded and confirmed by the store owner/admin.
              </p>
            </div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#22c55e' }}>
              Total Paid: ₱{totalPaidAmount.toFixed(2)}
            </div>
          </div>

          {payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🧾</div>
              <h4 style={{ color: 'var(--text)', marginBottom: '4px' }}>No Payment Records Yet</h4>
              <p>When you make a payment at the store, the owner will record it here.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Payment Ref #</th>
                  <th>Note / Details</th>
                  <th>Verification</th>
                  <th style={{ textAlign: 'right' }}>Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const dateStr = new Date(p.payment_date || p.created_at || Date.now()).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                        {dateStr}
                      </td>
                      <td>
                        <span style={{ fontWeight: '800', color: 'var(--gold-200)' }}>
                          {p.receipt_no || `PAY-${p.id}`}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text)' }}>
                        {p.note || 'Payment received by Store Owner'}
                      </td>
                      <td>
                        <span className="badge status-success">
                          ✓ Verified & Credited
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: '#22c55e' }}>
                        +₱{Number(p.amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── RECEIPT MODAL ── */}
      {selectedReceiptSale && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSelectedReceiptSale(null)}
        >
          <div 
            className="card"
            style={{
              maxWidth: '440px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid var(--border-gold)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ 
                width: '44px', 
                height: '44px', 
                background: 'var(--gradient-crimson)', 
                borderRadius: '12px', 
                color: '#fff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 8px',
                fontSize: '18px',
                fontWeight: '900'
              }}>
                SS
              </div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: '900', color: 'var(--text)', margin: 0 }}>
                SHELLA SARI-SARI STORE
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Official Utang Credit Voucher
              </p>
            </div>

            <div style={{ 
              background: 'var(--card-elevated)', 
              borderRadius: '10px', 
              padding: '12px', 
              fontSize: '12px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '4px',
              marginBottom: '16px'
            }}>
              <div>Invoice: <strong style={{ color: 'var(--gold-200)' }}>{selectedReceiptSale.invoice_no}</strong></div>
              <div>Customer: <strong style={{ color: 'var(--text)' }}>{member?.name}</strong></div>
              <div>Date: <span style={{ color: 'var(--text-secondary)' }}>{new Date(selectedReceiptSale.created_at || selectedReceiptSale.date || Date.now()).toLocaleString()}</span></div>
              <div>Type: <span className="badge status-danger" style={{ fontSize: '10px' }}>UTANG (CREDIT)</span></div>
            </div>

            <table className="table" style={{ fontSize: '12px', marginBottom: '16px' }}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedReceiptSale.items && selectedReceiptSale.items.length > 0 ? (
                  selectedReceiptSale.items.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '600' }}>{it.product_name || it.name || 'Store Item'}</td>
                      <td style={{ textAlign: 'center' }}>{it.quantity || 1}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--crimson)' }}>
                        ₱{Number(it.subtotal || (it.quantity * it.unit_price) || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Credit Transaction</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div style={{ 
              borderTop: '1px dashed var(--card-border)', 
              paddingTop: '12px', 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '16px',
              fontWeight: '900',
              marginBottom: '18px'
            }}>
              <span style={{ color: 'var(--text)' }}>TOTAL UTANG:</span>
              <span style={{ color: 'var(--crimson)' }}>₱{Number(selectedReceiptSale.total_amount || 0).toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }} 
                onClick={() => window.print()}
              >
                🖨️ Print
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1 }} 
                onClick={() => setSelectedReceiptSale(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}