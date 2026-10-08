import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Container from '../../components/layout/Container';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PasswordInput from '../../components/ui/PasswordInput';
import { IconLock } from '../../components/ui/icons';
import { resetPassword, ApiError } from '../../api/client';
import './AuthPage.css';

/**
 * ResetPasswordPage
 *
 * Lands here from the link emailed by POST /api/auth/forgot-password,
 * e.g. /reset-password?token=.... Calls POST /api/auth/reset-password
 * directly (not through AuthContext -- resetting a password doesn't by
 * itself establish a session; the backend requires a fresh login
 * afterward, matching its own design).
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validate() {
    const nextErrors = {};
    if (!password) {
      nextErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirm your new password.';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await resetPassword({ token, newPassword: password });
      setSubmitted(true);
    } catch (err) {
      setErrors({
        form: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const missingToken = !token;

  return (
    <Container className="auth-page">
      <Card padding="lg" className="auth-card">
        <div className="auth-card__header">
          <span className="auth-card__icon">
            <IconLock />
          </span>
          <h1 className="auth-card__title">Choose a new password</h1>
        </div>

        {missingToken ? (
          <p className="auth-card__subtitle" role="alert">
            This reset link is missing or invalid. Request a new one below.
          </p>
        ) : submitted ? (
          <p className="auth-card__subtitle" role="status">
            Your password has been reset. You can log in with it now.
          </p>
        ) : (
          <form className="auth-card__form" onSubmit={handleSubmit} noValidate>
            {errors.form ? (
              <p className="auth-card__subtitle" role="alert">
                {errors.form}
              </p>
            ) : null}
            <PasswordInput
              label="New password"
              icon={<IconLock width={16} height={16} />}
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={errors.password}
              autoComplete="new-password"
            />
            <PasswordInput
              label="Confirm new password"
              icon={<IconLock width={16} height={16} />}
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={submitting}>
              {submitting ? 'Resetting…' : 'Reset password'}
            </Button>
          </form>
        )}

        <p className="auth-card__footer">
          {missingToken ? (
            <Link to="/forgot-password" className="auth-card__footer-link">
              Request a new reset link
            </Link>
          ) : (
            <Link to="/login" className="auth-card__footer-link">
              Back to log in
            </Link>
          )}
        </p>
      </Card>
    </Container>
  );
}
