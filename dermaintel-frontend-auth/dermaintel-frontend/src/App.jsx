import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ComingSoon from './pages/ComingSoon';
import Dashboard from './pages/Dashboard/Dashboard';
import AuthPage from './pages/Auth/AuthPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';
import VerifyEmailPage from './pages/Auth/VerifyEmailPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ScanAnalyze from './pages/Scan/ScanAnalyze';
import Processing from './pages/Processing/Processing';
import Results from './pages/Results/Results';
import Monitoring from './pages/Monitoring/Monitoring';
import History from './pages/History/History';
import Pipeline from './pages/Pipeline/Pipeline';

/**
 * Route map for the six primary destinations plus auth. Dashboard,
 * Auth, Scan & Analyze, Processing, Results, Monitoring, History and
 * Pipeline are all built and wired to the Express backend. Only the
 * 404 catch-all still renders <ComingSoon />.
 *
 * Scan, Processing, Results, Monitoring, History and Pipeline are
 * wrapped in <ProtectedRoute> because the backend's /api/predict and
 * /api/predictions now require a logged-in session (requireAuth) --
 * without this, a logged-out visitor could reach these pages and only
 * find out they're not logged in after a failed request deep inside
 * the page. Dashboard stays unwrapped: it already branches internally
 * on isAuthenticated (LoggedInView vs LoggedOutView) and is the
 * intended landing page for logged-out visitors.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="signup" element={<AuthPage mode="signup" />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route
          path="scan"
          element={
            <ProtectedRoute>
              <ScanAnalyze />
            </ProtectedRoute>
          }
        />
        <Route
          path="processing"
          element={
            <ProtectedRoute>
              <Processing />
            </ProtectedRoute>
          }
        />
        <Route
          path="results"
          element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          }
        />
        <Route
          path="monitoring"
          element={
            <ProtectedRoute>
              <Monitoring />
            </ProtectedRoute>
          }
        />
        <Route
          path="history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="pipeline"
          element={
            <ProtectedRoute>
              <Pipeline />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <ComingSoon
              eyebrow="404"
              title="Page not found"
              description="That route doesn't exist yet. Use the navigation above to get back on track."
            />
          }
        />
      </Route>
    </Routes>
  );
}
