import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, LogIn, Moon, Sun } from 'lucide-react';
import type { UserRole, LoginCredentials } from '../types';
import { ROLES, BLUE_GRADIENT } from '../constants/roles';
import { LOGIN_FEATURES, FEATURE_CYCLE_INTERVAL } from '../constants/features';
import { useTheme } from '../hooks/useTheme';
import { useMouseTracker } from '../hooks/useMouseTracker';
import { isValidEmail } from '../utils/validation';
import logo from '../assets/peerspace-logo.png';
import InteractiveDots from '../components/InteractiveDots';
import '../styles/Login.css';

/**
 * Login Component
 * Handles user authentication for students, instructors, and admins
 */
const Login: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);

    const credentials: LoginCredentials = {
      email,
      password,
      role: selectedRole,
    };

    // TODO: Replace with actual API call
    setTimeout(() => {
      console.log('Login attempt:', credentials);
      setIsLoading(false);
      // Navigation logic will be implemented here
    }, 1500);
  };

  // Auto-cycle through features
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev: number) => (prev + 1) % LOGIN_FEATURES.length);
    }, FEATURE_CYCLE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Set Page Title
  useEffect(() => {
    document.title = 'PeerSpace - Login';
  }, []);

  const { mousePosition, containerRef } = useMouseTracker();

  const currentFeatureData = LOGIN_FEATURES[currentFeature];

  return (
    <div className={`login-page ${isDarkMode ? 'dark-mode' : ''}`}>
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

      {/* Left Side - Form Section */}
      <div className="login-left-panel">
        <div className="login-card">
          {/* Logo */}
          <div className="login-logo-top">
            <img src={logo} alt="PeerSpace Logo" className="logo-img-top" />
            <span className="logo-text-top">PeerSpace</span>
          </div>

          {/* Form Header */}
          <div className="form-header">
            <h2>Login</h2>
          </div>

          {/* Role Selector - Compact */}
          <div className="role-selector-compact">
            {ROLES.map((role) => {
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

          {/* Login Form */}
          <form
            className="login-form"
            onSubmit={handleSubmit}
          >
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
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" className="forgot-password">Forgot password?</a>
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
                <>
                  <LogIn size={18} />
                  <span>Sign in</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="login-divider">
              <span>or</span>
            </div>

            {/* Google Login Button */}
            <button
              type="button"
              className="btn-google"
              onClick={() => { /* TODO: Implement Google Login */ }}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </form>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-footer">
            <p>Don't have an account? <Link to="/signup">Sign up here</Link></p>
          </div>
        </div>
      </div>

      {/* Right Side - Geometric Design with PeerSpace Content */}
      <div
        className="login-right-panel"
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

                  {/* Progress Tracking View */}
                  {currentFeatureData.type === 'progress' && (
                    <div className="progress-view">
                      {currentFeatureData.screenContent.items?.map((item, index) => (
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
                  {currentFeatureData.type === 'collaboration' && (
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
                        {currentFeatureData.screenContent.messages?.map((msg, index) => (
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

                  {/* Todo Task List View */}
                  {currentFeatureData.type === 'todo' && currentFeatureData.screenContent.tasks && (
                    <div className="todo-view">
                      {currentFeatureData.screenContent.tasks.map((task, index) => (
                        <motion.div
                          key={index}
                          className={`todo-item ${task.completed ? 'completed' : ''}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="todo-checkbox">
                            {task.completed && <span className="checkmark">✓</span>}
                          </div>
                          <div className="todo-content">
                            <div className="todo-text">{task.text}</div>
                            <div className={`todo-priority priority-${task.priority}`}>{task.priority}</div>
                          </div>
                        </motion.div>
                      ))}
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
          {LOGIN_FEATURES.map((_, index) => (
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

export default Login;
