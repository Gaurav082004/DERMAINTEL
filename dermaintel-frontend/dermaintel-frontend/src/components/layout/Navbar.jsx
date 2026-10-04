import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import Logo from './Logo';
import Container from './Container';
import Button from '../ui/Button';
import ThemeToggle from '../ui/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/scan', label: 'Scan & Analyze' },
  { to: '/results', label: 'Results' },
  { to: '/monitoring', label: 'Monitoring' },
  { to: '/history', label: 'History' },
  { to: '/pipeline', label: 'Pipeline' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="navbar">
      <Container className="navbar__inner">
        <Logo />

        <nav className="navbar__links navbar__links--desktop" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                ['navbar__link', isActive ? 'navbar__link--active' : ''].filter(Boolean).join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar__actions navbar__actions--desktop">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <span className="navbar__user mono" title={user?.email}>
                {user?.email}
              </span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Log Out
              </Button>
            </>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost" size="sm">
                Log In
              </Button>
              <Button as={Link} to="/signup" variant="primary" size="sm">
                Sign Up
              </Button>
            </>
          )}
        </div>

        <div className="navbar__mobile-actions">
          <ThemeToggle />
          <button
            type="button"
            className="navbar__toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={['navbar__toggle-bar', menuOpen ? 'is-open' : ''].join(' ')} />
          </button>
        </div>
      </Container>

      {menuOpen && (
        <div className="navbar__mobile">
          <Container>
            <nav className="navbar__links navbar__links--mobile" aria-label="Primary mobile">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    ['navbar__link', isActive ? 'navbar__link--active' : ''].filter(Boolean).join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="navbar__actions navbar__actions--mobile">
              {isAuthenticated ? (
                <>
                  <span className="navbar__user navbar__user--mobile mono">{user?.email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                  >
                    Log Out
                  </Button>
                </>
              ) : (
                <>
                  <Button as={Link} to="/login" variant="ghost" size="sm" fullWidth onClick={() => setMenuOpen(false)}>
                    Log In
                  </Button>
                  <Button as={Link} to="/signup" variant="primary" size="sm" fullWidth onClick={() => setMenuOpen(false)}>
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
