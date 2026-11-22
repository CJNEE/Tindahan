import React from 'react'
import { useLocation } from 'react-router-dom'

export default function Header({ onToggleMenu, isDarkMode, onToggleTheme }) {
  const location = useLocation()
  const userRole = localStorage.getItem('sari_role') || 'admin'
  let memberData = null
  try {
    memberData = JSON.parse(localStorage.getItem('sari_member') || 'null')
  } catch(e) {
    memberData = null
  }

  const isMember = userRole === 'member'

  const getPageInfo = () => {
    const path = location.pathname
    if (path === '/member') return { title: 'My Suki Account & Utang', icon: '👤' }
    if (path === '/') return { title: 'Dashboard', icon: '🏠' }
    if (path.startsWith('/products')) return { title: 'Products', icon: '📦' }
    if (path.startsWith('/pos') || path.startsWith('/shop')) return { title: 'Shop', icon: '🛒' }
    if (path.startsWith('/customers')) return { title: 'Customers', icon: '👥' }
    if (path.startsWith('/payments')) return { title: 'Payments', icon: '💳' }
    if (path.startsWith('/receipts')) return { title: 'Receipts', icon: '🧾' }
    if (path.startsWith('/history')) return { title: 'History', icon: '🕒' }
    if (path.startsWith('/receipt')) return { title: 'Receipt', icon: '🧾' }
    return { title: 'Shop', icon: '🛒' }
  }

  const { title, icon } = getPageInfo()

  return (
    <header className="header">
      <div className="header-left">
        <button 
          className="header-menu-btn" 
          onClick={onToggleMenu} 
          title="Toggle Navigation Menu"
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>
        <div className="header-title-wrap">
          <span className="title-icon">{icon}</span>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="header-right">
        {/* Light / Dark Mode Toggle Switch */}
        <button 
          className="header-action-btn" 
          onClick={onToggleTheme}
          title={isDarkMode ? "Switch to Eye-Friendly Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle theme"
        >
          {isDarkMode ? '🌙' : '☀️'}
        </button>

        {isMember && memberData?.image_data ? (
          <img 
            src={memberData.image_data}
            alt={memberData.name}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--crimson)',
              boxShadow: '0 2px 10px rgba(225, 29, 72, 0.4)'
            }}
            title={memberData.name}
          />
        ) : (
          <div className="header-user-btn" title={isMember ? (memberData?.name || 'Suki Member') : "Admin Account"}>
            {isMember ? (memberData?.name ? memberData.name.charAt(0).toUpperCase() : 'M') : '👤'}
          </div>
        )}
      </div>
    </header>
  )
}