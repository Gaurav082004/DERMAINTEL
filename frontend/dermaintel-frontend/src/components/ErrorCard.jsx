import './ErrorCard.css';

export default function ErrorCard({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="error-card" role="alert">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
      </svg>
      <p>{message}</p>
      {onDismiss && (
        <button className="error-card__close" onClick={onDismiss} aria-label="Dismiss error">
          ×
        </button>
      )}
    </div>
  );
}
