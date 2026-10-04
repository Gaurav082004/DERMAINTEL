import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ComingSoon from './pages/ComingSoon';
import Dashboard from './pages/Dashboard/Dashboard';
import AuthPage from './pages/Auth/AuthPage';
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
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="signup" element={<AuthPage mode="signup" />} />
        <Route path="scan" element={<ScanAnalyze />} />
        <Route path="processing" element={<Processing />} />
        <Route path="results" element={<Results />} />
        <Route path="monitoring" element={<Monitoring />} />
        <Route path="history" element={<History />} />
        <Route path="pipeline" element={<Pipeline />} />
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
