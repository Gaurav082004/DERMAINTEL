import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute
 *
 * Wraps any route that requires a logged-in session. This exists
 * because the backend hard-gates /api/predict and /api/predictions
 * with requireAuth (401 if no session) -- without this, a logged-out
 * user could still navigate to e.g. /scan and only discover they're
 * not logged in after submitting, deep inside a failed fetch call.
 *
 * Waits for AuthContext's isLoading to resolve before deciding
 * anything -- otherwise a logged-in user refreshing the page would
 * flash through a redirect to /login before the session-restore check
 * (GET /me) has had a chance to come back.
 *
 * On redirect, the attempted path is preserved via route state
 * (`state.from`) -- AuthPage already reads this today to send the user
 * back where they meant to go after logging in.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null; // Avoid a redirect flash while the session check is in flight.
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
