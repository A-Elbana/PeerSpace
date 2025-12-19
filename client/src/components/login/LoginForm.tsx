import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import axios, { AxiosError } from 'axios';
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
            console.error('Login failed:', err);

            let errorMessage = 'Login failed. Please try again.';
            let statusCode: number | undefined;

            if (axios.isAxiosError(err)) {
                const axiosError = err as AxiosError<{ message?: string }>;
                statusCode = axiosError.response?.status;

                console.group('Login Error Details');
                console.error('Status:', statusCode);
                console.error('Response Data:', axiosError.response?.data);
                console.error('Request URL:', axiosError.config?.url);
                console.error('Request Method:', axiosError.config?.method?.toUpperCase());
                console.groupEnd();

                if (statusCode === 401) {
                    errorMessage = 'Invalid email or password. Please try again.';
                } else if (statusCode === 403) {
                    errorMessage = 'Your account is not activated. Please check your email.';
                } else if (statusCode === 400) {
                    errorMessage = axiosError.response?.data?.message || 'Please fill in all required fields.';
                } else if (statusCode === 405) {
                    errorMessage = 'Server error: Method Not Allowed (405). Please contact support.';
                } else if (statusCode === 500) {
                    errorMessage = 'Server error. Please try again later.';
                } else if (!axiosError.response) {
                    errorMessage = 'Network error. Please check your internet connection.';
                } else {
                    errorMessage = axiosError.response?.data?.message || `Login failed (${statusCode}). Please try again.`;
                }
            } else {
                console.error('Non-Axios error:', err);
            }

            setError(errorMessage);
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

            </form>

            <div className="form-footer">
                <p>Don't have an account? <Link to="/signup">Sign up here</Link></p>
            </div>
        </div>
    );
};

export default LoginForm;
