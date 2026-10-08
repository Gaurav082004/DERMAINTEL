import { forwardRef } from 'react';
import './Button.css';

/**
 * Button
 *
 * variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
 * size:    'sm' | 'md' | 'lg'
 *
 * Renders a <button> by default. Pass `as="a"` plus an `href`, or any
 * other component (e.g. react-router's Link) via `as` to render that
 * element instead while keeping the same visual styling.
 */
const Button = forwardRef(function Button(
  {
    as: Component = 'button',
    variant = 'primary',
    size = 'md',
    iconLeft = null,
    iconRight = null,
    fullWidth = false,
    className = '',
    children,
    ...rest
  },
  ref
) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component ref={ref} className={classes} {...rest}>
      {iconLeft ? <span className="btn__icon btn__icon--left">{iconLeft}</span> : null}
      <span className="btn__label">{children}</span>
      {iconRight ? <span className="btn__icon btn__icon--right">{iconRight}</span> : null}
    </Component>
  );
});

export default Button;
