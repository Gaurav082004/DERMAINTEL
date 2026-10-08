import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Container from '../../components/layout/Container';
import Card from '../../components/ui/Card';
import { IconCheckCircle, IconAlertTriangle } from '../../components/ui/icons';
import { verifyEmail, ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import './AuthPage.css';

/**
 * VerifyEmailPage
 *
 * Lands here from the link emailed on signup, e.g.
 * /verify-email?token=.... Calls GET /api/auth/verify-email once on
 * mount; no form, just a status display. If the person happens to
 * already be logged in in this browser, refreshes AuthContext's user
 * afterward so the UI picks up emailVerified: true immediately rather
 * than only on next login.
 */
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { isAuthenticated, refreshUser } = useAuth();

  const [status, setStatus] = useState('pending'); // 'pending' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing or invalid.');
      return;
    }

    let cancelled = false;
    verifyEmail(token)
      .then(() => {
        if (cancelled) return;
        setStatus('success');
        if (isAuthenticated) refreshUser();
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      });

    return () => {
      cancelled = true;
    };
    // Intentionally run once on mount -- re-running on isAuthenticated/
    // refreshUser changes would re-verify (and could re-trigger) an
    // already-consumed token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <Container className="auth-page">
      <Card padding="lg" className="auth-card">
        <div className="auth-card__header">
          <span className="auth-card__icon">
            {status === 'error' ? <IconAlertTriangle /> : <IconCheckCircle />}
          </span>
          <h1 className="auth-card__title">
            {status === 'pending' && 'Verifying your email…'}
            {status === 'success' && 'Email verified'}
            {status === 'error' && 'Verification failed'}
          </h1>
          {status === 'error' ? <p className="auth-card__subtitle">{message}</p> : null}
          {status === 'success' ? (
            <p className="auth-card__subtitle">Your email address has been verified.</p>
          ) : null}
        </div>

        <p className="auth-card__footer">
          <Link to="/" className="auth-card__footer-link">
            Go to Dashboard
          </Link>
        </p>
      </Card>
    </Container>
  );
}
