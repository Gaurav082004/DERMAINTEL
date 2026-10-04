import './PageSection.css';

/**
 * PageSection
 *
 * Vertical rhythm wrapper for a page area, with an optional
 * eyebrow / title / description / action header row. Pages built in
 * later stages compose their content inside `children`.
 */
export default function PageSection({
  eyebrow,
  title,
  description,
  action,
  className = '',
  children,
  ...rest
}) {
  const hasHeader = eyebrow || title || description || action;

  return (
    <section className={['page-section', className].filter(Boolean).join(' ')} {...rest}>
      {hasHeader && (
        <div className="page-section__header">
          <div className="page-section__heading">
            {eyebrow ? <span className="page-section__eyebrow">{eyebrow}</span> : null}
            {title ? <h2 className="page-section__title">{title}</h2> : null}
            {description ? <p className="page-section__description">{description}</p> : null}
          </div>
          {action ? <div className="page-section__action">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
