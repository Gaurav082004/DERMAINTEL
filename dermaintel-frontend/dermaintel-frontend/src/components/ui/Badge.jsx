import './Badge.css';

/**
 * Badge
 *
 * tone: 'neutral' | 'accent' | 'low' | 'moderate' | 'elevated' | 'critical' | 'info' | 'stress'
 * Used for risk tiers, status labels and small counters.
 */
export default function Badge({ tone = 'neutral', dot = false, className = '', children, ...rest }) {
  const classes = ['badge', `badge--${tone}`, className].filter(Boolean).join(' ');

  return (
    <span className={classes} {...rest}>
      {dot ? <span className="badge__dot" /> : null}
      {children}
    </span>
  );
}
