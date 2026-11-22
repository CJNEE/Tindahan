import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()

  const userRole = localStorage.getItem('sari_role') || 'admin'
  let memberData = null
  try {
    memberData = JSON.parse(localStorage.getItem('sari_member') || 'null')
  } catch(e) {
    memberData = null
  }

  const isMember = userRole === 'member'

  const adminNavItems = [
    { to:'/', label:'Dashboard', icon:'🏠' },
    { to:'/products', label:'Products', icon:'📦' },
    { to:'/shop', label:'Shop', icon:'🛒' },
    { to:'/customers', label:'Customers', icon:'👥' },
    { to:'/payments', label:'Payments', icon:'💳' },
    { to:'/receipts', label:'Receipts', icon:'🧾' },
    { to:'/history', label:'History', icon:'🕒' }
  ]

  const memberNavItems = [
    { to:'/member', label:'My Account & Utang', icon:'👤' }
  ]

  const navItems = isMember ? memberNavItems : adminNavItems

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('sari_role')
    localStorage.removeItem('sari_member')
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
        <div className="brand-subtitle">
          {isMember ? 'Suki Member Portal' : 'SariSari Store POS'}
        </div>
      </div>

      {/* Navigation */}
      <nav className="nav">
        {navItems.map((item) => (
          <NavLink 
            key={item.to} 
            to={item.to} 
            end={item.to === '/' || item.to === '/member'} 
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
          {isMember && memberData?.image_data ? (
            <img 
              src={memberData.image_data} 
              alt={memberData.name} 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--crimson)'
              }}
            />
          ) : (
            <div className="user-avatar-circle">
              {isMember ? (memberData?.name ? memberData.name.charAt(0).toUpperCase() : 'M') : '👤'}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="user-name">
              {isMember ? (memberData?.name || 'Suki Member') : 'Admin'}
            </span>
            <span className="user-role">
              {isMember ? 'Suki Member ⭐' : 'Store Owner 👑'}
            </span>
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