import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { removeTokens } from '../utils/auth';

/**
 * Logout Component
 * Handles user logout by clearing tokens and redirecting to landing page
 */
const Logout = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Clear authentication tokens
        removeTokens();

        // Redirect to landing page
        navigate('/', { replace: true });
    }, [navigate]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontFamily: 'var(--font-primary)'
        }}>
            <p>Logging out...</p>
        </div>
    );
};

export default Logout;
