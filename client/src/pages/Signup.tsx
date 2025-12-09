import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { UserRole } from '../types';
import { Mail, Lock, User, Moon, Sun } from 'lucide-react';
import { ROLES, BLUE_GRADIENT } from '../constants/roles';
import { SIGNUP_FEATURES } from '../constants/features';
import { useTheme } from '../hooks/useTheme';
import { useMouseTracker } from '../hooks/useMouseTracker';
import '../styles/Signup.css';
import InteractiveDots from '../components/InteractiveDots';
import logo from '../assets/peerspace-logo.png';

/**
 * Signup Component
 * Handles new user registration for PeerSpace
 */
const Signup: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { mousePosition, containerRef } = useMouseTracker();

  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  // Replaced fullName with firstName and lastName
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = SIGNUP_FEATURES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate signup - Replace with actual registration logic
    setTimeout(() => {
      // Concatenate names for submission if needed, or send separately
      // const fullName = `${firstName} ${lastName}`.trim(); 
      // console.log('Signup attempt:', { firstName, lastName, email, password, role: selectedRole });
      setIsLoading(false);
    }, 1500);
  };

  // Auto-cycle through features
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [features.length]);

  // Set Page Title
  useEffect(() => {
    document.title = 'PeerSpace - Sign Up';
  }, []);

  const currentFeatureData = features[currentFeature];

  return (
    <div className={`signup-page ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Theme Toggle Button */}
      <motion.button
        className="theme-toggle"
        onClick={toggleTheme}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Toggle dark mode"
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </motion.button>

      {/* Left Side - Signup Card */}
      <div className="signup-left-panel">
        <div className="signup-card">
          {/* Logo */}
          <div className="login-logo-top">
            <img src={logo} alt="PeerSpace Logo" className="logo-img-top" />
            <span className="logo-text-top">PeerSpace</span>
          </div>

          {/* Form Header */}
          <div className="form-header">
            <h2>Sign Up</h2>
          </div>

          {/* Role Selector */}
          <div className="role-selector-compact">
            {ROLES.filter(role => role.id !== 'admin').map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  className={`role-btn-compact ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedRole(role.id)}
                  style={{
                    background: isSelected ? BLUE_GRADIENT : 'transparent',
                    borderColor: isSelected ? '#2563eb' : '#e5e7eb'
                  }}
                  aria-pressed={isSelected}
                >
                  <Icon size={16} style={{ color: isSelected ? '#ffffff' : '#9ca3af' }} />
                  <span className="role-name" style={{ color: isSelected ? '#ffffff' : '#6b7280' }}>
                    {role.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Signup Form */}
          <form
            className="signup-form"
            onSubmit={handleSubmit}
          >
            {/* Split Name Fields */}
            <div className="form-row">
              <div className="form-group half-width">
                <label htmlFor="firstName">First Name</label>
                <div className="input-wrapper">
                  <User size={16} className="input-icon" />
                  <input
                    id="firstName"
                    type="text"
                    className="input"
                    placeholder="John"
                    value={firstName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group half-width">
                <label htmlFor="lastName">Last Name</label>
                <div className="input-wrapper">
                  <User size={16} className="input-icon" />
                  <input
                    id="lastName"
                    type="text"
                    className="input"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="your.email@university.edu"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="confirmPassword"
                  type="password"
                  className="input"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <motion.div
                  className="loading-spinner"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <span>Create account</span>
              )}
            </button>

            {/* Divider */}
            <div className="signup-divider">
              <span>or</span>
            </div>

            {/* Google Signup Button */}
            <button
              type="button"
              className="btn-google"
              onClick={() => { /* TODO: Implement Google Signup */ }}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Sign up with Google</span>
            </button>
          </form>

          <div className="form-footer">
            <p>Already have an account? <Link to="/login">Sign in</Link></p>
          </div>
        </div>
      </div>

      {/* Right Side - Feature Showcase (same as login) */}
      <div
        className="signup-right-panel"
        ref={containerRef}
        style={{
          '--mouse-x': `${mousePosition.x}px`,
          '--mouse-y': `${mousePosition.y}px`,
        } as React.CSSProperties}
      >
        {/* Geometric Background Shapes */}
        <div className="geometric-shapes">
          <div className="shape shape-triangle-1"></div>
          <div className="shape shape-triangle-2"></div>
          <div className="shape shape-circle-1"></div>
          <div className="shape shape-circle-2"></div>
          <div className="shape shape-half-circle"></div>
          {/* Interactive Scattering Dots */}
          <InteractiveDots />
        </div>

        {/* Device Illustration */}
        <div className="device-illustration">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentFeature}
              className="laptop-device"
              initial={{ opacity: 0, scale: 0.9, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: -50 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <div className="laptop-screen">
                <div className="screen-content">
                  <div className="screen-header">{currentFeatureData.screenContent.header}</div>

                  {/* Community Stats View */}
                  {currentFeatureData.type === 'community' && currentFeatureData.screenContent.stats && (
                    <div className="stats-view">
                      {currentFeatureData.screenContent.stats.map((stat, index) => (
                        <motion.div
                          key={index}
                          className="stat-item"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="stat-value">{stat.value}</div>
                          <div className="stat-label">{stat.label}</div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Progress Tracking View */}
                  {currentFeatureData.type === 'progress' && currentFeatureData.screenContent.items && (
                    <div className="progress-view">
                      {currentFeatureData.screenContent.items.map((item, index) => (
                        <div key={index} className="course-item">
                          <div className="course-thumb"></div>
                          <div className="course-info">
                            <div className="course-title">{item.title}</div>
                            <div className="course-progress">
                              <div className="progress-bar">
                                <motion.div
                                  className="progress-fill"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.progress}%` }}
                                  transition={{ duration: 0.8, delay: 0.2 }}
                                ></motion.div>
                              </div>
                            </div>
                            <div className="course-meta">{item.due}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Collaboration/Chat View */}
                  {currentFeatureData.type === 'collaboration' && currentFeatureData.screenContent.messages && (
                    <div className="chat-view">
                      <div className="chat-header-info">
                        <div className="chat-group-avatar">
                          <div className="avatar-dot"></div>
                          <div className="avatar-dot"></div>
                          <div className="avatar-dot"></div>
                        </div>
                        <div className="chat-group-info">
                          <div className="chat-group-name">Study Community</div>
                          <div className="chat-group-members">{currentFeatureData.screenContent.members} members</div>
                        </div>
                      </div>
                      <div className="chat-messages">
                        {currentFeatureData.screenContent.messages.map((msg, index) => (
                          <motion.div
                            key={index}
                            className={`chat-message ${msg.user === 'You' ? 'own-message' : ''}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="message-user">{msg.user}</div>
                            <div className="message-bubble">
                              <div className="message-text">{msg.text}</div>
                              <div className="message-time">{msg.time}</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      <div className="chat-input">
                        <div className="input-placeholder">Type a message...</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="laptop-base"></div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Text Content */}
        <div className="right-panel-text">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentFeature}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <h1 className="panel-title">{currentFeatureData.title}</h1>
              <p className="panel-subtitle">{currentFeatureData.subtitle}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Dots */}
        <div className="nav-dots">
          {features.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`dot ${index === currentFeature ? 'active' : ''}`}
              onClick={() => setCurrentFeature(index)}
              aria-label={`Go to feature ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Signup;
