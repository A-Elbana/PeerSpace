import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { setTokens } from '../utils/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, LogIn, Moon, Sun, Eye, EyeOff, Home } from 'lucide-react';

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


  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Client-side validation
    const errors: typeof fieldErrors = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await api.post('/auth/login', {
        email,
        password,
      });

      setTokens(data.accessToken, data.refreshToken);

      // Redirect based on role or default to dashboard
      navigate('/explore');
    } catch (err: any) {
      console.error('Login failed', err);
      console.error('Status:', err.response?.status);
      console.error('Message:', err.response?.data?.message);

      // Extract detailed error message from response
      const errorMessage = err.response?.data?.message;
      const statusCode = err.response?.status;

      // Provide user-friendly error messages based on status code
      if (statusCode === 401) {
        // Unauthorized - Invalid credentials
        setError('Invalid email or password. Please try again.');
      } else if (statusCode === 403) {
        // Forbidden - Account not activated
        setError('Your account is not activated. Please check your email.');
      } else if (statusCode === 400) {
        // Bad Request - Missing fields
        setError(errorMessage || 'Please fill in all required fields.');
      } else if (statusCode === 500) {
        setError('Server error. Please try again later.');
      } else if (!err.response) {
        setError('Network error. Please check your internet connection.');
      } else {
        // Show the actual error message for debugging
        setError(errorMessage || `Login failed (${statusCode}). Please try again.`);
      }
    } finally {
      setIsLoading(false);
    }
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
      {/* Home Button */}
      <motion.button
        onClick={() => navigate('/')}
        whileHover={{ scale: 1.2, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Go to home"
        className="fixed top-4 left-4 p-3 rounded-lg bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all duration-300 z-50 hover:-translate-y-1"
      >
        <Home size={24} />
      </motion.button>

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
                  className={`input ${fieldErrors.email ? 'input-error' : ''}`}
                  placeholder="your.email@university.edu"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors({ ...fieldErrors, email: undefined });
                    }
                  }}
                  required
                />
              </div>
              {fieldErrors.email && (
                <div className="field-error">{fieldErrors.email}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`input ${fieldErrors.password ? 'input-error' : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors({ ...fieldErrors, password: undefined });
                    }
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <div className="field-error">{fieldErrors.password}</div>
              )}
            </div>

            <div className="form-actions">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" className="forgot-password">Forgot password?</a>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <motion.div
                    className="loading-spinner"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <span>Signing in...</span>
                </>
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
