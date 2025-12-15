import React, { useEffect, useMemo } from 'react';
import { HomeButton, ThemeToggle, LoginForm, FeatureShowcase } from '../components/login';
import { useTheme } from '../hooks/useTheme';
import { PAGE_TITLES } from '../constants/ui';
import '../styles/Login.css';

/**
 * Login Component
 * Handles user authentication for students, instructors, and admins
 */
const Login: React.FC = () => {
  const { isDarkMode } = useTheme();

  // Set Page Title
  useEffect(() => {
    document.title = PAGE_TITLES.LOGIN;
  }, []);

  const handleLoginSuccess = () => {
    // Login success is handled in LoginForm component
  };

  const containerClassName = useMemo(() =>
    `login-page ${isDarkMode ? 'dark' : ''}`,
    [isDarkMode]
  );

  return (
    <div className={containerClassName}>
      <HomeButton />
      <ThemeToggle />

      {/* Left Side - Form Section */}
      <div className="login-left-panel">
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>

      {/* Right Side - Feature Showcase */}
      <FeatureShowcase />
    </div>
  );
};

export default Login;