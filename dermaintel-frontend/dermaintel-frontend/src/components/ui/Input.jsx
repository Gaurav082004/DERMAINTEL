import { forwardRef, useId } from 'react';
import './Input.css';

/**
 * Input
 *
 * A labeled text input with optional leading icon, helper text and
 * error state. Forwards all remaining props (value, onChange, type,
 * placeholder, disabled...) straight to the native <input>.
 */
const Input = forwardRef(function Input(
  { label, icon = null, helperText, error, className = '', id, ...rest },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      {label ? (
        <label htmlFor={inputId} className="field__label">
          {label}
        </label>
      ) : null}

      <div className={['field__control', error ? 'field__control--error' : ''].filter(Boolean).join(' ')}>
        {icon ? <span className="field__icon">{icon}</span> : null}
        <input ref={ref} id={inputId} className="field__input" {...rest} />
      </div>

      {error ? (
        <p className="field__message field__message--error">{error}</p>
      ) : helperText ? (
        <p className="field__message">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Input;
