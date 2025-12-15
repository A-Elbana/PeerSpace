import Profile from './pages/Profile';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { redirectToLogout } from './utils/navigation';
import { TOASTER_CONFIG } from './constants/ui';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Logout from './pages/Logout';
import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Announcements from './pages/Announcements';
import Community from './pages/Community';
import PostPreview from './pages/Community/PostPreview.tsx';
import ManageCommunity from './pages/ManageCommunity';
import AssignmentDetails from './pages/Assignments/AssignmentDetails';
import Assignments from './pages/Assignments/Assignments';
import { Submissions, SubmissionDetail } from './pages/Submissions';
import Schedule from './pages/Schedule/Schedule';
import FileAttachmentTest from './pages/FileTest';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Notes from './pages/Notes/Notes';
import Tasks from './pages/Tasks/index.tsx';
import TaskDetail from './pages/Tasks/TaskDetail';
import './styles/App.css';
import LandingPage from './pages/LandingPage';

/**
 * Main Application Component
 * Handles routing for the PeerSpace application with authentication protection
 */
function App() {
  return (
    <ErrorBoundary>
      <Toaster {...TOASTER_CONFIG} />
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
                <Explore onLogout={redirectToLogout} />
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
            path="/notes"
            element={
              <ProtectedRoute>
                <Notes />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <Tasks onLogout={() => window.location.href = '/logout'} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tasks/:taskId"
            element={
              <ProtectedRoute>
                <TaskDetail onLogout={() => window.location.href = '/logout'} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assignments"
            element={
              <ProtectedRoute>
                <Assignments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/submissions"
            element={
              <ProtectedRoute>
                <Submissions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/submission/:submissionId"
            element={
              <ProtectedRoute>
                <SubmissionDetail />
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
            path="/community/:communityId/post/:postId"
            element={
              <ProtectedRoute>
                <PostPreview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/community/:communityId/assignment/:assignmentId"
            element={
              <ProtectedRoute>
                <AssignmentDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/schedule"
            element={
              <ProtectedRoute>
                <Schedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile onLogout={redirectToLogout} />
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

          <Route
            path="/file-test"
            element={
              <ProtectedRoute>
                <FileAttachmentTest />
              </ProtectedRoute>
            }
          />

          <Route path="/logout" element={<Logout />} />

          {/* Fallback route for 404 */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

