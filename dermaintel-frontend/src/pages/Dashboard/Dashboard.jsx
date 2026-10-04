import LoggedOutView from './LoggedOutView';
import LoggedInView from './LoggedInView';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

/**
 * Dashboard
 *
 * Renders the logged-out landing view or the logged-in overview view
 * based on the real (mock) auth session from AuthContext, now that
 * Stage 2 exists. The temporary "Preview mode" switcher from Stage 1
 * has been removed since it's no longer needed.
 */
export default function Dashboard() {
  const { isAuthenticated } = useAuth();

  return <div className="dashboard">{isAuthenticated ? <LoggedInView /> : <LoggedOutView />}</div>;
}
