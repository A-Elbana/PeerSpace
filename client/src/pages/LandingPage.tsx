import React from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Features from '../components/Features'
import Footer from '../components/Footer'
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';
import '../styles/landing.css';

const LandingPage: React.FC = () => {
  const [theme, setTheme] = React.useState<'theme-light' | 'theme-dark'>('theme-dark');
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = 'PeerSpace - Collaborative Learning Platform';
  }, []);

  React.useEffect(() => {
    if (isAuthenticated()) {
      navigate('/explore');
    }
  }, [navigate]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'theme-dark' ? 'theme-light' : 'theme-dark');
  };

  return (
    <div className={`landing-root ${theme}`}>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <main>
        <Hero theme={theme} />
        <Features />
      </main>
      <Footer />
    </div>
  )
}

export default LandingPage
