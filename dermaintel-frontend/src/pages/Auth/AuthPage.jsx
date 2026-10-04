import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Container from '../../components/layout/Container';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import Checkbox from '../../components/ui/Checkbox';
import Badge from '../../components/ui/Badge';
import { IconMail, IconLock } from '../../components/ui/icons';
import { useAuth } from '../../context/AuthContext';
import './AuthPage.css';

const DEMO_EMAIL = 'demo@dermaintel.app';

/**
 * AuthPage — MOCK / DEMO ONLY.
 *
 * Handles both the "login" and "signup" routes with one shared card
 * and an internal toggle, matching the reference screenshot. There is
 * no backend: submitting either form just validates the fields in the
 * browser and, if valid, records a local demo session via
 * AuthContext, then redirects to the Dashboard.
 *
 * `mode` prop: 'login' | 'signup' — sets which tab is active first;
 * the in-page toggle can still switch it, keeping the URL in sync.
 */
export default function AuthPage({ mode: initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Keep local mode in sync if the user arrives via a direct route
  // change (e.g. clicking "Log In" vs "Sign Up" in the Navbar).
  useEffect(() => {
    setMode(initialMode);
    setErrors({});
  }, [initialMode]);

  function switchMode(nextMode) {
    setMode(nextMode);
    setErrors({});
    navigate(nextMode === 'login' ? '/login' : '/signup', { replace: true });
  }

  function validate() {
    const nextErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }

    if (mode === 'signup') {
      if (!confirmPassword) {
        nextErrors.confirmPassword = 'Confirm your password.';
      } else if (confirmPassword !== password) {
        nextErrors.confirmPassword = 'Passwords do not match.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    // Mock login/signup: no request is sent anywhere, and the
    // password itself is never passed to login() or stored.
    login({ email: email.trim(), remember });
    const redirectTo = location.state?.from || '/';
    navigate(redirectTo, { replace: true });
  }

  function handleDemoLogin() {
    login({ email: DEMO_EMAIL, remember: true });
    navigate('/', { replace: true });
  }

  const isSignup = mode === 'signup';

  return (
    <Container className="auth-page">
      <Card padding="lg" className="auth-card">
        <div className="auth-card__header">
          <span className="auth-card__icon">
            <IconLock />
          </span>
          <h1 className="auth-card__title">
            {isSignup ? 'Create your DERMAINTEL account' : 'Log in to DERMAINTEL'}
          </h1>
          <p className="auth-card__subtitle">
            Frontend demo authentication — no data leaves your browser.
          </p>
        </div>

        <div className="auth-card__toggle" role="group" aria-label="Choose login or signup">
          <button
            type="button"
            className={['auth-card__toggle-option', !isSignup ? 'is-active' : ''].join(' ')}
            aria-pressed={!isSignup}
            onClick={() => switchMode('login')}
          >
            Log In
          </button>
          <button
            type="button"
            className={['auth-card__toggle-option', isSignup ? 'is-active' : ''].join(' ')}
            aria-pressed={isSignup}
            onClick={() => switchMode('signup')}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-card__form" onSubmit={handleSubmit} noValidate>
          <Input
            label="Email address"
            type="email"
            icon={<IconMail width={16} height={16} />}
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
            autoComplete="email"
          />

          <PasswordInput
            label="Password"
            icon={<IconLock width={16} height={16} />}
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
          />

          {isSignup ? (
            <PasswordInput
              label="Confirm password"
              icon={<IconLock width={16} height={16} />}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
          ) : null}

          <div className="auth-card__row">
            <Checkbox
              label="Remember this session"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth>
            {isSignup ? 'Create Account' : 'Log In to Dashboard'}
          </Button>
        </form>

        <div className="auth-card__demo">
          <Button type="button" variant="secondary" size="md" fullWidth onClick={handleDemoLogin}>
            1-Click Demo Login
          </Button>
          <Badge tone="info" className="auth-card__demo-badge">
            DEMO DATA
          </Badge>
        </div>

        <p className="auth-card__footer">
          {isSignup ? (
            <>
              Already have an account?{' '}
              <Link to="/login" className="auth-card__footer-link">
                Log in here
              </Link>
            </>
          ) : (
            <>
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="auth-card__footer-link">
                Sign up here
              </Link>
            </>
          )}
        </p>
      </Card>
    </Container>
  );
}
