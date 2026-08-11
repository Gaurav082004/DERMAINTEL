import './SeverityCard.css';

const TIER_CLASS = {
  Low: 'tier--low',
  Medium: 'tier--medium',
  High: 'tier--high',
};

export default function SeverityCard({ severityScore, tier, ood }) {
  const score = Number(severityScore) || 0;
  const pct = Math.min(Math.max((score / 10) * 100, 0), 100);
  const tierClass = TIER_CLASS[tier] || 'tier--medium';

  return (
    <div className="card result-card">
      <div className="result-card__header">
        <span className="eyebrow">Stage 2 — Context-Aware Severity Assessment</span>
        {ood && (
          <span className={`tag ${ood.is_ood ? 'tag--warn' : ''}`}>
            {ood.is_ood ? 'Image not accepted' : 'Prediction accepted'}
          </span>
        )}
      </div>

      <div className="severity-body">
        <div className="severity-gauge">
          <svg viewBox="0 0 120 70" className="severity-gauge__svg">
            <path
              d="M10 65 A50 50 0 0 1 110 65"
              fill="none"
              stroke="var(--surface-sunken)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M10 65 A50 50 0 0 1 110 65"
              fill="none"
              stroke="var(--signal)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 157} 157`}
            />
          </svg>
          <div className="severity-gauge__value">
            <span className="mono">{score.toFixed(2)}</span>
            <span className="severity-gauge__max"> / 10</span>
          </div>
        </div>

        <div className="severity-tier">
          <span className="severity-tier__label">Context Tier</span>
          <span className={`severity-tier__badge ${tierClass}`}>{tier || '—'}</span>
        </div>
      </div>

      <p className="severity-note">
        This score is a research-prototype output, not a clinically validated risk prediction.
      </p>
    </div>
  );
}
