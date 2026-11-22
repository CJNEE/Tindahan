import React from 'react'
import { useLocation } from 'react-router-dom'

export default function Header({ onToggleMenu, isDarkMode, onToggleTheme }) {
  const location = useLocation()

  const getPageInfo = () => {
    const path = location.pathname
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
        <div className="header-search">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search products..."
            id="global-product-search"
          />
        </div>

        {/* Light / Dark Mode Toggle Switch */}
        <button 
          className="header-action-btn" 
          onClick={onToggleTheme}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle theme"
        >
          {isDarkMode ? '🌙' : '☀️'}
        </button>

        <div className="header-user-btn" title="Admin Account">
          👤
        </div>
      </div>
    </header>
  )
}
