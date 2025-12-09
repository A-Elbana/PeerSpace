import React, { useEffect, useState } from 'react';


interface NavbarProps {
  theme: 'theme-light' | 'theme-dark';
  toggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ theme, toggleTheme }) => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 140)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`ps-navbar ${scrolled ? 'scrolled' : ''}`} role="banner">
      <div className="ps-navbar-inner">
        <div className="ps-brand">PeerSpace</div>
        <nav className="ps-nav">
          <a href="#features">Features</a>
          <button className="theme-toggle-nav" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'theme-dark' ? '☀️' : '🌙'}
          </button>
        </nav>
      </div>
    </header>
  )
}

export default Navbar
