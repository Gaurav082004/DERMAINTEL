import { useState } from 'react';
import { Link } from 'react-router-dom';
import Container from '../../components/layout/Container';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { IconMail } from '../../components/ui/icons';
import { forgotPassword, ApiError } from '../../api/client';
import './AuthPage.css';

/**
 * ForgotPasswordPage
 *
 * Calls POST /api/auth/forgot-password directly (not through
 * AuthContext -- this never changes session/user state, so it doesn't
 * belong on that context). The backend always returns the same
 * generic success message whether or not the email exists, by design
 * (prevents account enumeration) -- this page shows that same message
 * unconditionally once the request completes, and never implies
 * whether the account was actually found.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validate() {
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      // Always shown, regardless of whether the email was found --
      // matches the backend's own anti-enumeration behavior.
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container className="auth-page">
      <Card padding="lg" className="auth-card">
        <div className="auth-card__header">
          <span className="auth-card__icon">
            <IconMail />
          </span>
          <h1 className="auth-card__title">Reset your password</h1>
          <p className="auth-card__subtitle">
            Enter the email on your account and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {submitted ? (
          <p className="auth-card__subtitle" role="status">
            If that email exists, a reset link has been sent. Check your inbox.
          </p>
        ) : (
          <form className="auth-card__form" onSubmit={handleSubmit} noValidate>
            <Input
              label="Email address"
              type="email"
              icon={<IconMail width={16} height={16} />}
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={error}
              autoComplete="email"
            />
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}

        <p className="auth-card__footer">
          Remembered your password?{' '}
          <Link to="/login" className="auth-card__footer-link">
            Log in here
          </Link>
        </p>
      </Card>
    </Container>
  );
}
