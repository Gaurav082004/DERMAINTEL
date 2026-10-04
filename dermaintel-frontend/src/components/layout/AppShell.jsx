import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Container from './Container';
import './AppShell.css';

/**
 * AppShell
 * The persistent frame for every page: navbar at the top, a centered
 * content column below, and a lightweight footer. Individual pages
 * render into <Outlet /> via the router.
 */
export default function AppShell() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-shell__main">
        <Outlet />
      </main>
      <footer className="app-shell__footer">
        <Container className="app-shell__footer-inner">
          <span>DERMAINTEL · AI-assisted dermatology decision support</span>
          <span className="mono">v0.1 · frontend shell</span>
        </Container>
      </footer>
    </div>
  );
}
