import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ children }){
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('shella_theme') !== 'light'
  })

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark')
      document.body.classList.remove('light')
      localStorage.setItem('shella_theme', 'dark')
    } else {
      document.body.classList.add('light')
      document.body.classList.remove('dark')
      localStorage.setItem('shella_theme', 'light')
    }
  }, [isDarkMode])

  const toggleTheme = () => setIsDarkMode(prev => !prev)
  const toggleMobileMenu = () => setMobileMenuOpen(prev => !prev)
  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <div className={`app-shell ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Mobile Backdrop when drawer is open */}
      {mobileMenuOpen && (
        <div 
          className="mobile-backdrop" 
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar with mobile drawer support */}
      <Sidebar isOpen={mobileMenuOpen} onClose={closeMobileMenu} />

      <div className="main">
        {/* Header with theme toggle and mobile hamburger */}
        <Header 
          onToggleMenu={toggleMobileMenu} 
          isDarkMode={isDarkMode} 
          onToggleTheme={toggleTheme} 
        />
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  )
}
