import './EnvironmentCard.css';

const ROWS = [
  { key: 'temperature', label: 'Temperature', unit: '°C' },
  { key: 'humidity', label: 'Humidity', unit: '%' },
  { key: 'uvIndex', label: 'UV Index', unit: '' },
  { key: 'aqi', label: 'AQI / PM2.5', unit: '' },
];

export default function EnvironmentCard({ environment, stress }) {
  return (
    <div className="card result-card">
      <div className="result-card__header">
        <span className="eyebrow">Context Inputs</span>
      </div>
      <p className="env-card__note">User-provided contextual values used for this prediction.</p>

      <div className="env-card__grid">
        {ROWS.map((row) => (
          <div key={row.key} className="env-card__item">
            <span className="env-card__label">{row.label}</span>
            <span className="env-card__value mono">
              {environment?.[row.key] ?? '—'} {row.unit}
            </span>
          </div>
        ))}
        <div className="env-card__item">
          <span className="env-card__label">Stress</span>
          <span className="env-card__value mono">{stress ?? '—'} / 10</span>
        </div>
      </div>
    </div>
  );
}
