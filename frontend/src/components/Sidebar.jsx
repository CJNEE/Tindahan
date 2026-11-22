import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()

  const navItems = [
    { to:'/', label:'Dashboard', icon:'🏠' },
    { to:'/products', label:'Products', icon:'📦' },
    { to:'/shop', label:'Shop', icon:'🛒' },
    { to:'/customers', label:'Customers', icon:'👥' },
    { to:'/payments', label:'Payments', icon:'💳' },
    { to:'/receipts', label:'Receipts', icon:'🧾' },
    { to:'/history', label:'History', icon:'🕒' }
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
    window.location.reload()
  }

  const handleNavClick = () => {
    if (onClose) onClose()
  }

  return (
    <div className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header with Dog Logo */}
      <div className="sidebar-brand">
        <img 
          src="/shella-dog.png" 
          alt="Shella" 
          className="brand-avatar"
          onError={(e) => { e.target.src = '/shella-logo.png'; }}
        />
        <div className="brand-title">
          <span>SHELLA</span>
          <span style={{ fontSize: '14px', color: '#ff2d55' }}>🐾</span>
        </div>
        <div className="brand-subtitle">SariSari Store</div>
      </div>

      {/* Navigation */}
      <nav className="nav">
        {navItems.map((item) => (
          <NavLink 
            key={item.to} 
            to={item.to} 
            end={item.to === '/'} 
            onClick={handleNavClick}
            className={({isActive}) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom User Profile with Simplified Logout Button */}
      <div className="user-section">
        <div className="user-info">
          <div className="user-avatar-circle">
            👤
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="user-name">Admin</span>
            <span className="user-role">Owner</span>
          </div>
        </div>
        
        {/* Simplified Logout button with clear text */}
        <button 
          className="sidebar-logout-btn" 
          onClick={handleLogout} 
          title="Sign out of system"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}
