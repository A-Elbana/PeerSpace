import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Logout from './pages/Logout';
import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Announcements from './pages/Announcements';
import Community from './pages/Community';
import ManageCommunity from './pages/ManageCommunity';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import './styles/App.css';
import LandingPage from './pages/LandingPage';

/**
 * Main Application Component
 * Handles routing for the PeerSpace application with authentication protection
 */
function App() {
  return (
    <>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: '#1a1a2e',
            border: '1px solid #2a2a4a',
            color: '#ffffff',
            padding: '16px 20px',
            fontSize: '15px',
            minWidth: '320px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
          },
          classNames: {
            success: 'bg-green-600 border-green-700 text-white',
            error: 'bg-red-600 border-red-700 text-white',
            warning: 'bg-yellow-600 border-yellow-700 text-white',
            info: 'bg-blue-600 border-blue-700 text-white',
          },
        }}
      />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          {/* Public routes - redirect to dashboard if already authenticated */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />

          {/* Protected routes - require authentication */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/explore"
            element={
              <ProtectedRoute>
                <Explore onLogout={() => window.location.href = '/logout'} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/announcements"
            element={
              <ProtectedRoute>
                <Announcements />
              </ProtectedRoute>
            }
          />

          <Route
            path="/community/:communityId"
            element={
              <ProtectedRoute>
                <Community />
              </ProtectedRoute>
            }
          />

          <Route
            path="/community/:communityId/manage"
            element={
              <ProtectedRoute>
                <ManageCommunity />
              </ProtectedRoute>
            }
          />

          <Route path="/logout" element={<Logout />} />

          {/* Fallback route for 404 */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;

