import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import Container from '../../components/layout/Container';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import { IconMail, IconLock } from '../../components/ui/icons';
import { useAuth } from '../../context/AuthContext';
import { getGoogleLoginUrl, ApiError } from '../../api/client';
import './AuthPage.css';

/**
 * AuthPage — real authentication.
 *
 * Handles both the "login" and "signup" routes with one shared card
 * and an internal toggle. Submits to the real backend via AuthContext
 * (signup/login), which calls Express and establishes a real session
 * cookie -- no password is ever stored client-side beyond the lifetime
 * of this form's local state.
 *
 * `mode` prop: 'login' | 'signup' — sets which tab is active first;
 * the in-page toggle can still switch it, keeping the URL in sync.
 */
export default function AuthPage({ mode: initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const { signup, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Keep local mode in sync if the user arrives via a direct route
  // change (e.g. clicking "Log In" vs "Sign Up" in the Navbar).
  useEffect(() => {
    setMode(initialMode);
    setErrors({});
  }, [initialMode]);

  // Google Sign-In redirects back here with ?error=<code> on failure
  // (it's a full-page browser redirect, not a fetch call, so the
  // backend can't hand back a normal JSON error -- this is how it
  // communicates failure instead). Shown once, then stripped from the
  // URL so refreshing the page doesn't keep re-showing a stale error.
  useEffect(() => {
    const code = searchParams.get('error');
    if (!code) return;

    const messages = {
      google_not_configured: 'Google Sign-In is not available right now.',
      google_auth_failed: 'Google Sign-In did not complete. Please try again.',
      google_email_unverified:
        "That Google account's email address isn't verified. Log in with your password instead, or verify your Google account and try again.",
      service_unavailable: 'Our authentication service is temporarily unavailable. Please try again shortly.',
    };
    setErrors({ form: messages[code] || 'Google Sign-In did not complete. Please try again.' });
    navigate(location.pathname, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function switchMode(nextMode) {
    setMode(nextMode);
    setErrors({});
    navigate(nextMode === 'login' ? '/login' : '/signup', { replace: true });
  }

  function validate() {
    const nextErrors = {};

    if (mode === 'signup' && !name.trim()) {
      nextErrors.name = 'Name is required.';
    }

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

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signup({ name: name.trim(), email: email.trim(), password });
      } else {
        await login({ email: email.trim(), password });
      }
      const redirectTo = location.state?.from || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setErrors({
        form: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
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
          {errors.form ? (
            <p className="auth-card__subtitle" role="alert">
              {errors.form}
            </p>
          ) : null}

          {isSignup ? (
            <Input
              label="Full name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={errors.name}
              autoComplete="name"
            />
          ) : null}

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

          {!isSignup ? (
            <div className="auth-card__row">
              <Link to="/forgot-password" className="auth-card__footer-link">
                Forgot password?
              </Link>
            </div>
          ) : null}

          <Button type="submit" variant="primary" size="lg" fullWidth disabled={submitting}>
            {submitting ? 'Please wait…' : isSignup ? 'Create Account' : 'Log In to Dashboard'}
          </Button>
        </form>

        <div className="auth-card__demo">
          <Button as="a" href={getGoogleLoginUrl()} variant="secondary" size="md" fullWidth>
            Continue with Google
          </Button>
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
