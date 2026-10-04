import './FeatureCard.css';

/**
 * FeatureCard
 * Icon + title + description block, used for architecture / capability
 * explainer grids (e.g. Dashboard and, later, the Pipeline page).
 */
export default function FeatureCard({ icon, title, description, className = '', ...rest }) {
  return (
    <div className={['feature-card', className].filter(Boolean).join(' ')} {...rest}>
      {icon ? <span className="feature-card__icon">{icon}</span> : null}
      <h4 className="feature-card__title">{title}</h4>
      <p className="feature-card__description">{description}</p>
    </div>
  );
}
