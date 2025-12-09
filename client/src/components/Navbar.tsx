import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const Navbar: React.FC = () => {
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
          <a href="#pricing">Pricing</a>
          <a href="#about">About</a>
          <Link to="/signup" className="cta">Join Now</Link>
        </nav>
      </div>
    </header>
  )
}

export default Navbar
