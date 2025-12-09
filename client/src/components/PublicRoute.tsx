import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';

interface PublicRouteProps {
    children: React.ReactNode;
}

/**
 * PublicRoute Component
 * Wraps routes that should only be accessible when NOT authenticated (like login/signup)
 * Redirects to dashboard if user is already authenticated
 */
const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
    if (isAuthenticated()) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

export default PublicRoute;
