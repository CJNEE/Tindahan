import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [roleMode, setRoleMode] = useState('member'); // 'member' | 'admin'
  const [isRegistering, setIsRegistering] = useState(false);

  // Login credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Member Registration fields
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('shella_theme') !== 'light';
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('shella_theme', next ? 'dark' : 'light');
  };

  // Helper chip selector
  const selectDemoAccount = (u, p, mode = 'member') => {
    setRoleMode(mode);
    setIsRegistering(false);
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/login/', { username, password });
      const data = res.data;

      localStorage.setItem('token', data.token);

      if (data.role === 'member' || roleMode === 'member') {
        const memberData = data.member || {
          id: data.id || 1,
          name: data.name || username,
          phone: username,
          username: username,
          credit_status: 'good'
        };
        localStorage.setItem('sari_role', 'member');
        localStorage.setItem('sari_member', JSON.stringify(memberData));
        navigate('/member');
      } else {
        localStorage.setItem('sari_role', 'admin');
        navigate('/');
      }
      window.location.reload();
    } catch (err) {
      // Local fallback checks for smooth offline / demo experience
      const storedCustomers = JSON.parse(localStorage.getItem('sari_local_customers') || '[]');

      if (roleMode === 'admin') {
        if (username.toLowerCase() === 'admin' && (password === 'admin' || password === 'admin123' || !password)) {
          localStorage.setItem('token', 'local-admin-token-12345');
          localStorage.setItem('sari_role', 'admin');
          navigate('/');
          window.location.reload();
          return;
        }
        setError('Invalid owner/admin credentials. Default: admin / admin');
      } else {
        // Match member against local customers
        const found = storedCustomers.find(c => 
          (c.username && c.username.toLowerCase() === username.toLowerCase()) ||
          (c.phone && c.phone === username) ||
          (c.name && c.name.toLowerCase() === username.toLowerCase())
        );

        if (found) {
          localStorage.setItem('token', `local-member-token-${found.id}`);
          localStorage.setItem('sari_role', 'member');
          localStorage.setItem('sari_member', JSON.stringify(found));
          navigate('/member');
          window.location.reload();
          return;
        }

        // Demo fallback for maria and juan
        if (username.toLowerCase() === 'maria' || username === '0917-123-4567') {
          const maria = {
            id: 1,
            name: 'Maria Santos',
            phone: '0917-123-4567',
            address: 'Brgy. San Antonio',
            username: 'maria',
            credit_status: 'good',
            total_utang: 450.0,
            total_paid: 0.0,
            utang_balance: 450.0
          };
          localStorage.setItem('token', 'local-member-token-1');
          localStorage.setItem('sari_role', 'member');
          localStorage.setItem('sari_member', JSON.stringify(maria));
          navigate('/member');
          window.location.reload();
          return;
        }

        if (username.toLowerCase() === 'juan' || username === '0918-987-6543') {
          const juan = {
            id: 2,
            name: 'Juan Dela Cruz',
            phone: '0918-987-6543',
            address: 'Brgy. Poblacion',
            username: 'juan',
            credit_status: 'good',
            total_utang: 280.0,
            total_paid: 0.0,
            utang_balance: 280.0
          };
          localStorage.setItem('token', 'local-member-token-2');
          localStorage.setItem('sari_role', 'member');
          localStorage.setItem('sari_member', JSON.stringify(juan));
          navigate('/member');
          window.location.reload();
          return;
        }

        setError('Member account not found. Try Maria or register below.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!regName || !regPhone) {
      setError('Name and Phone Number are required.');
      return;
    }

    setLoading(true);
    setError(null);

    const newCustomer = {
      name: regName,
      phone: regPhone,
      address: regAddress,
      username: regUsername || regPhone,
      password: regPassword || 'password123',
      credit_status: 'good',
      total_utang: 0,
      total_paid: 0,
      utang_balance: 0
    };

    try {
      const res = await api.post('/auth/member-register/', newCustomer);
      const data = res.data;
      localStorage.setItem('token', data.token);
      localStorage.setItem('sari_role', 'member');
      localStorage.setItem('sari_member', JSON.stringify(data.member || newCustomer));

      // Sync local customers
      const stored = JSON.parse(localStorage.getItem('sari_local_customers') || '[]');
      localStorage.setItem('sari_local_customers', JSON.stringify([data.member || newCustomer, ...stored]));

      navigate('/member');
      window.location.reload();
    } catch (err) {
      // Local fallback registration
      const newId = Date.now();
      const localCust = { ...newCustomer, id: newId };
      const stored = JSON.parse(localStorage.getItem('sari_local_customers') || '[]');
      localStorage.setItem('sari_local_customers', JSON.stringify([localCust, ...stored]));

      localStorage.setItem('token', `local-member-token-${newId}`);
      localStorage.setItem('sari_role', 'member');
      localStorage.setItem('sari_member', JSON.stringify(localCust));

      navigate('/member');
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div 
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative',
        transition: 'background var(--transition)'
      }}
    >
      {/* Top Floating Theme Switch */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
        <button
          className="header-action-btn"
          onClick={toggleTheme}
          title={isDarkMode ? "Switch to Eye-Friendly Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle Theme"
        >
          {isDarkMode ? '🌙' : '☀️'}
        </button>
      </div>

      <div 
        className="card"
        style={{
          width: '450px',
          maxWidth: '100%',
          padding: '36px 32px',
          borderRadius: '24px',
          boxShadow: isDarkMode 
            ? '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(225, 29, 72, 0.2)' 
            : '0 20px 50px -10px rgba(15, 23, 42, 0.12), 0 0 30px rgba(225, 29, 72, 0.08)',
          position: 'relative',
          zIndex: 2,
          border: '1px solid var(--card-border)'
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '22px', textAlign: 'center' }}>
          <img 
            src="/shella-dog.png" 
            alt="Shella" 
            style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              objectFit: 'cover',
              border: '3px solid var(--crimson)',
              boxShadow: '0 6px 20px var(--crimson-glow)',
              marginBottom: '10px' 
            }} 
            onError={e => { e.target.src = '/shella-logo.png'; }}
          />
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '24px', fontWeight: '900', color: 'var(--text)', margin: 0 }}>
            SHELLA SARI-SARI 🐾
          </h1>
          <p style={{ color: 'var(--brand-subtitle-color)', fontSize: '13px', fontWeight: '700', margin: '4px 0 0' }}>
            Store POS & Suki Member Portal
          </p>
        </div>

        {/* Tab Selection: Member vs Admin */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '8px', 
          background: 'var(--card-elevated)', 
          padding: '4px', 
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => { setRoleMode('member'); setIsRegistering(false); setError(null); }}
            style={{
              padding: '9px 12px',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              background: roleMode === 'member' ? 'var(--gradient-crimson)' : 'transparent',
              color: roleMode === 'member' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
              boxShadow: roleMode === 'member' ? '0 2px 10px var(--crimson-glow)' : 'none'
            }}
          >
            👥 Suki Member
          </button>

          <button
            type="button"
            onClick={() => { setRoleMode('admin'); setIsRegistering(false); setError(null); }}
            style={{
              padding: '9px 12px',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              background: roleMode === 'admin' ? 'var(--gradient-crimson)' : 'transparent',
              color: roleMode === 'admin' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
              boxShadow: roleMode === 'admin' ? '0 2px 10px var(--crimson-glow)' : 'none'
            }}
          >
            👑 Store Owner / Admin
          </button>
        </div>

        {/* Form Container */}
        {!isRegistering ? (
          /* Sign In Form */
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">
                {roleMode === 'member' ? 'Username or Phone Number' : 'Admin Username'}
              </label>
              <input
                className="form-input"
                placeholder={roleMode === 'member' ? 'e.g. maria or 0917-123-4567' : 'Enter username (admin)'}
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder={roleMode === 'member' ? 'Enter password (password123)' : 'Enter password (admin)'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{ 
                color: 'var(--danger-color)', 
                background: 'rgba(239,68,68,0.1)', 
                padding: '10px 14px', 
                borderRadius: '10px', 
                fontSize: '13px', 
                marginBottom: '16px', 
                border: '1px solid rgba(239,68,68,0.25)', 
                textAlign: 'center' 
              }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="btn-proceed-checkout"
              style={{ width: '100%', padding: '13px', marginBottom: '14px' }}
            >
              {loading ? 'Signing in...' : (roleMode === 'member' ? 'Sign In as Suki Member 🌟' : 'Sign In as Owner 👑')}
            </button>

            {roleMode === 'member' && (
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setIsRegistering(true); setError(null); }}
                  style={{
                    fontSize: '13px',
                    color: 'var(--crimson)',
                    fontWeight: '700',
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  New Suki Customer? Register a Member Account ✍️
                </button>
              </div>
            )}
          </form>
        ) : (
          /* Member Registration Form */
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', margin: '0 0 2px' }}>
                Create Suki Member Account
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Sign up to check your store utang and payment history anytime.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Full Name *</label>
              <input 
                className="form-input"
                placeholder="e.g. Maria Santos"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Mobile Phone Number *</label>
              <input 
                className="form-input"
                placeholder="e.g. 0917-123-4567"
                value={regPhone}
                onChange={e => setRegPhone(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Address (Barangay / Purok)</label>
              <input 
                className="form-input"
                placeholder="e.g. Brgy. San Antonio"
                value={regAddress}
                onChange={e => setRegAddress(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Username</label>
                <input 
                  className="form-input"
                  placeholder="e.g. maria"
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password</label>
                <input 
                  type="password"
                  className="form-input"
                  placeholder="e.g. password123"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div style={{ 
                color: 'var(--danger-color)', 
                background: 'rgba(239,68,68,0.1)', 
                padding: '10px 14px', 
                borderRadius: '10px', 
                fontSize: '13px', 
                marginBottom: '14px', 
                border: '1px solid rgba(239,68,68,0.25)', 
                textAlign: 'center' 
              }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="btn-proceed-checkout"
              style={{ width: '100%', padding: '13px', marginBottom: '12px' }}
            >
              {loading ? 'Creating Account...' : '✨ Create Member Account'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => { setIsRegistering(false); setError(null); }}
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  fontWeight: '600',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                Already have an account? Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Quick Demo Credentials for Fast Testing */}
        <div style={{ 
          marginTop: '22px', 
          paddingTop: '16px', 
          borderTop: '1px dashed var(--card-border)',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>
            ⚡ 1-Click Demo Accounts:
          </span>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            <button
              type="button"
              className="badge"
              style={{ 
                background: 'rgba(225, 29, 72, 0.12)', 
                color: 'var(--crimson)', 
                cursor: 'pointer',
                border: '1px solid rgba(225, 29, 72, 0.25)',
                padding: '5px 10px',
                fontSize: '11.5px'
              }}
              onClick={() => selectDemoAccount('maria', 'password123', 'member')}
            >
              👤 Member: Maria
            </button>

            <button
              type="button"
              className="badge"
              style={{ 
                background: 'rgba(59, 130, 246, 0.12)', 
                color: '#3b82f6', 
                cursor: 'pointer',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                padding: '5px 10px',
                fontSize: '11.5px'
              }}
              onClick={() => selectDemoAccount('juan', 'password123', 'member')}
            >
              👤 Member: Juan
            </button>

            <button
              type="button"
              className="badge"
              style={{ 
                background: 'rgba(234, 179, 8, 0.15)', 
                color: 'var(--gold-200)', 
                cursor: 'pointer',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                padding: '5px 10px',
                fontSize: '11.5px'
              }}
              onClick={() => selectDemoAccount('admin', 'admin', 'admin')}
            >
              👑 Owner: Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}