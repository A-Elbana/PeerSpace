import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import { setTokens } from '../../utils/auth';
import { isValidEmail } from '../../utils/validation';
import logo from '../../assets/peerspace-logo.png';

interface LoginFormProps {
    onLoginSuccess: () => void;
}

interface FieldErrors {
    email?: string;
    password?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setFieldErrors({});

        // Client-side validation
        const errors: FieldErrors = {};

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
            onLoginSuccess();
        } catch (err: unknown) {
            console.error('Login failed', err);
            const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
            console.error('Status:', axiosError.response?.status);
            console.error('Message:', axiosError.response?.data?.message);

            // Extract detailed error message from response
            const errorMessage = axiosError.response?.data?.message;
            const statusCode = axiosError.response?.status;

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
            } else if (!axiosError.response) {
                setError('Network error. Please check your internet connection.');
            } else {
                // Show the actual error message for debugging
                setError(errorMessage || `Login failed (${statusCode}). Please try again.`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
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
    );
};

export default LoginForm;
