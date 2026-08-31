import './ClassificationResult.css';

export default function ClassificationResult({ condition, confidence, ttaApplied }) {
  const pct = Math.round((confidence || 0) * 1000) / 10;

  return (
    <div className="card result-card">
      <div className="result-card__header">
        <span className="eyebrow">Stage 1 — Image Classification</span>
        {ttaApplied && <span className="tag">TTA applied</span>}
      </div>

      <div className="classification">
        <span className="classification__condition">{condition}</span>
        <span className="classification__pct mono">{pct}%</span>
      </div>

      <div className="confidence-bar">
        <div
          className="confidence-bar__fill confidence-bar__fill--animate"
          style={{ width: `${Math.min(pct, 100)}%`, '--target-width': `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="confidence-caption">Model confidence in the predicted condition</p>
    </div>
  );
}
