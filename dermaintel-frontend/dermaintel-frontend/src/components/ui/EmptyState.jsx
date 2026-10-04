import './EmptyState.css';

/**
 * EmptyState
 * Used wherever a section has no real data yet (no backend/no
 * analyses run). Shows an icon, a message, and an optional action.
 */
export default function EmptyState({ icon, title, description, action, className = '', ...rest }) {
  return (
    <div className={['empty-state', className].filter(Boolean).join(' ')} {...rest}>
      {icon ? <span className="empty-state__icon">{icon}</span> : null}
      <h4 className="empty-state__title">{title}</h4>
      {description ? <p className="empty-state__description">{description}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
