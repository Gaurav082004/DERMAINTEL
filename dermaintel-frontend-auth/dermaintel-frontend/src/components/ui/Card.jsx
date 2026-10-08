import './Card.css';

/**
 * Card
 *
 * A neutral surface container. Optional `eyebrow`, `title`, `action`
 * render a consistent header row; anything else goes in `children`.
 *
 * padding: 'sm' | 'md' | 'lg'
 * interactive: true adds a hover affordance for clickable cards
 */
export default function Card({
  eyebrow,
  title,
  action,
  padding = 'md',
  interactive = false,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'card',
    `card--pad-${padding}`,
    interactive ? 'card--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const hasHeader = eyebrow || title || action;

  return (
    <div className={classes} {...rest}>
      {hasHeader && (
        <div className="card__header">
          <div className="card__heading">
            {eyebrow ? <span className="card__eyebrow">{eyebrow}</span> : null}
            {title ? <h3 className="card__title">{title}</h3> : null}
          </div>
          {action ? <div className="card__action">{action}</div> : null}
        </div>
      )}
      <div className="card__body">{children}</div>
    </div>
  );
}
