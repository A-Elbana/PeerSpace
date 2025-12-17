import React from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import ProblemSection from '../components/ProblemSection'
import SolutionSection from '../components/SolutionSection'
import BentoGrid from '../components/BentoGrid'
import TechStack from '../components/TechStack'
import FinalCTA from '../components/FinalCTA'
import Footer from '../components/Footer'
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';
import '../styles/landing.css';

const LandingPage: React.FC = () => {
  const [theme, setTheme] = React.useState<'theme-light' | 'theme-dark'>('theme-light');
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
        <ProblemSection />
        <SolutionSection />
        <BentoGrid />
        <TechStack />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}

export default LandingPage
