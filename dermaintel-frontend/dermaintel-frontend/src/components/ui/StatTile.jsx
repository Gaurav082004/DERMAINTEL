import './StatTile.css';

/**
 * StatTile
 * A single metric: an icon, a large value, a label, and an optional
 * helper line underneath (e.g. "Run an analysis to populate this").
 */
export default function StatTile({ icon, value, label, helper, className = '', ...rest }) {
  return (
    <div className={['stat-tile', className].filter(Boolean).join(' ')} {...rest}>
      {icon ? <span className="stat-tile__icon">{icon}</span> : null}
      <div className="stat-tile__value">{value}</div>
      <div className="stat-tile__label">{label}</div>
      {helper ? <div className="stat-tile__helper">{helper}</div> : null}
    </div>
  );
}
