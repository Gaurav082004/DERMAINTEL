import { useNavigate, Link } from 'react-router-dom';
import NeuralBackground from '../components/NeuralBackground';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="login-page">
      <NeuralBackground density={40} />

      <div className="login-card card">
        <Link to="/" className="login-card__brand">
          <span className="navbar__mark" aria-hidden="true" />
          DERMAINTEL
        </Link>

        <h1 className="login-card__title">Welcome back</h1>
        <p className="login-card__subtitle">
          Sign in to run the DermaIntel analysis pipeline on a skin image.
        </p>

        <form className="login-card__form" onSubmit={(e) => e.preventDefault()}>
          <label className="login-field">
            <span>Email</span>
            <input type="email" placeholder="you@example.com" autoComplete="off" />
          </label>
          <label className="login-field">
            <span>Password</span>
            <input type="password" placeholder="••••••••" autoComplete="off" />
          </label>
          <button type="submit" className="btn btn-secondary login-card__submit" disabled>
            Sign in (coming soon)
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button className="btn btn-primary login-card__demo" onClick={() => navigate('/app')}>
          Continue / Demo Login
        </button>
        <p className="login-card__note">
          Authentication isn&rsquo;t implemented yet — this takes you straight into the live demo.
        </p>
      </div>
    </div>
  );
}
