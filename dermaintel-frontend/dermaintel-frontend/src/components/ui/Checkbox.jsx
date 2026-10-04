import { forwardRef, useId } from 'react';
import './Checkbox.css';

/**
 * Checkbox
 * A labeled checkbox styled to match the design system. Forwards all
 * native input props (checked, onChange, disabled...).
 */
const Checkbox = forwardRef(function Checkbox({ label, className = '', id, ...rest }, ref) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <label htmlFor={inputId} className={['checkbox', className].filter(Boolean).join(' ')}>
      <input ref={ref} id={inputId} type="checkbox" className="checkbox__input" {...rest} />
      <span className="checkbox__box" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6.2 4.8 9 10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {label ? <span className="checkbox__label">{label}</span> : null}
    </label>
  );
});

export default Checkbox;
