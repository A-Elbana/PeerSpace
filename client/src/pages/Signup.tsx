import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { isAuthenticated, setTokens } from '../utils/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { UserRole } from '../types';
import { Mail, Lock, User, Moon, Sun, Eye, EyeOff, Home, GraduationCap, BookOpen } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = SIGNUP_FEATURES;

  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/explore');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setFieldErrors({});

    // Client-side validation
    const errors: typeof fieldErrors = {};

    if (!firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (password.length > 128) {
      errors.password = 'Password must be less than 128 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/register', {
        email,
        password,
        fname: firstName.trim(),
        lname: lastName.trim(),
        role: selectedRole.toUpperCase(), // Backend expects data enum
      });
      console.log(response.data);

      setTokens(response.data.accessToken, response.data.refreshToken);

      // Redirect to dashboard on success (Auto-login)
      navigate('/explore');
    } catch (err: any) {
      console.error('Signup failed', err);

      // Extract detailed error message from response
      const errorMessage = err.response?.data?.message;
      const statusCode = err.response?.status;

      // Provide user-friendly error messages based on status code
      if (statusCode === 409) {
        setError('An account with this email already exists. Please use a different email or try logging in.');
      } else if (statusCode === 400) {
        // Handle specific validation errors
        if (errorMessage?.includes('email')) {
          setFieldErrors({ email: errorMessage });
        } else if (errorMessage?.includes('password') || errorMessage?.includes('Password')) {
          setFieldErrors({ password: errorMessage });
        } else if (errorMessage?.includes('required')) {
          setError(errorMessage);
        } else {
          setError(errorMessage || 'Invalid input. Please check your information and try again.');
        }
      } else if (statusCode === 500) {
        setError('Server error. Please try again later.');
      } else if (!err.response) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(errorMessage || 'Signup failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
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
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-3">
              I am a
            </label>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                type="button"
                onClick={() => setSelectedRole('student')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${selectedRole === 'student'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card hover:border-primary/50 text-muted-foreground'
                  }`}
              >
                <GraduationCap size={32} className="mb-2" />
                <span className="font-semibold">Student</span>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => setSelectedRole('instructor')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${selectedRole === 'instructor'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card hover:border-primary/50 text-muted-foreground'
                  }`}
              >
                <BookOpen size={32} className="mb-2" />
                <span className="font-semibold">Instructor</span>
              </motion.button>
            </div>
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
                    className={`input ${fieldErrors.firstName ? 'input-error' : ''}`}
                    placeholder="John"
                    value={firstName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setFirstName(e.target.value);
                      if (fieldErrors.firstName) {
                        setFieldErrors({ ...fieldErrors, firstName: undefined });
                      }
                    }}
                    required
                  />
                </div>
                {fieldErrors.firstName && (
                  <div className="field-error">{fieldErrors.firstName}</div>
                )}
              </div>
              <div className="form-group half-width">
                <label htmlFor="lastName">Last Name</label>
                <div className="input-wrapper">
                  <User size={16} className="input-icon" />
                  <input
                    id="lastName"
                    type="text"
                    className={`input ${fieldErrors.lastName ? 'input-error' : ''}`}
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setLastName(e.target.value);
                      if (fieldErrors.lastName) {
                        setFieldErrors({ ...fieldErrors, lastName: undefined });
                      }
                    }}
                    required
                  />
                </div>
                {fieldErrors.lastName && (
                  <div className="field-error">{fieldErrors.lastName}</div>
                )}
              </div>
            </div>

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
                  placeholder="Create a password (min. 8 characters)"
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

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`input ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                    }
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="password-toggle-btn"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <div className="field-error">{fieldErrors.confirmPassword}</div>
              )}
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
