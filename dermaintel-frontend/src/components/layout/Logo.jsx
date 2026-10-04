import { Link } from 'react-router-dom';
import './Logo.css';

/**
 * Logo
 * The DERMAINTEL wordmark with a pulse-signal icon and version tag.
 */
export default function Logo({ version = 'v0.1 · shell' }) {
  return (
    <Link to="/" className="logo" aria-label="DERMAINTEL home">
      <span className="logo__mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M2 12h4l2 7 4-14 2 7h8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="logo__text">
        <span className="logo__name">DERMAINTEL</span>
        <span className="logo__version mono">{version}</span>
      </span>
    </Link>
  );
}
