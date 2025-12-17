import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';
import logo from '../assets/peerspace-logo.png';

interface NavbarProps {
  theme: 'theme-light' | 'theme-dark';
  toggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ theme, toggleTheme }) => {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const { scrollY } = useScroll();
  const navbarOpacity = useTransform(scrollY, [0, 100], [0.95, 1]);
  const navbarBlur = useTransform(scrollY, [0, 100], [10, 20]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      
      // Determine active section based on scroll position
      const sections = ['hero', 'problem', 'solution', 'features', 'tech', 'cta'];
      const scrollPosition = window.scrollY + 100;
      
      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };
    
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { id: 'problem', label: 'Challenges' },
    { id: 'solution', label: 'Solution' },
    { id: 'features', label: 'Features' },
    { id: 'tech', label: 'Technology' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.offsetTop - 80;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }
  };

  return (
    <motion.header 
      className={`ps-navbar ${scrolled ? 'scrolled' : ''}`} 
      role="banner"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ 
        opacity: navbarOpacity,
        backdropFilter: `blur(${navbarBlur}px)`,
      }}
    >
      <div className="ps-navbar-inner">
        <motion.a 
          href="#hero"
          className="ps-brand"
          onClick={(e) => handleNavClick(e, 'hero')}
          whileHover={{ scale: 1.05, filter: 'drop-shadow(0 0 8px rgba(55, 111, 200, 0.5))' }}
          whileTap={{ scale: 0.95 }}
        >
          <img 
            src={logo} 
            alt="PeerSpace Logo" 
            className="ps-brand-logo"
            width="40"
            height="40"
          />
          <span className="ps-brand-text">PeerSpace</span>
        </motion.a>
        
        <nav className="ps-nav">
          {navItems.map((item) => (
            <motion.a
              key={item.id}
              href={`#${item.id}`}
              className={activeSection === item.id ? 'active' : ''}
              onClick={(e) => handleNavClick(e, item.id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * navItems.indexOf(item) }}
            >
              {item.label}
              {activeSection === item.id && (
                <motion.div
                  className="nav-indicator"
                  layoutId="nav-indicator"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </motion.a>
          ))}
          
          {isAuthenticated() && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <Link to="/explore" className="nav-cta-link">
                Dashboard
              </Link>
            </motion.div>
          )}
          
          <motion.button 
            className="theme-toggle-nav" 
            onClick={toggleTheme} 
            aria-label="Toggle theme"
            whileHover={{ rotate: 180, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.3 }}
            initial={{ opacity: 0, rotate: -180 }}
            animate={{ opacity: 1, rotate: 0 }}
          >
            {theme === 'theme-dark' ? '☀️' : '🌙'}
          </motion.button>
        </nav>
      </div>
    </motion.header>
  )
}

export default Navbar
