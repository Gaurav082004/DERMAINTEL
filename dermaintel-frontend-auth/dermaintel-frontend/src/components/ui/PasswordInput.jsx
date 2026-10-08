import { forwardRef, useId, useState } from 'react';
import './Input.css';
import './PasswordInput.css';

/**
 * PasswordInput
 * Reuses Input's field styling (same classes/CSS file) and adds a
 * show/hide toggle button. Kept as its own component rather than a
 * prop on Input, since the toggle button and icon-swap logic are
 * specific to password fields.
 */
const PasswordInput = forwardRef(function PasswordInput(
  { label, icon = null, helperText, error, className = '', id, ...rest },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      {label ? (
        <label htmlFor={inputId} className="field__label">
          {label}
        </label>
      ) : null}

      <div className={['field__control', error ? 'field__control--error' : ''].filter(Boolean).join(' ')}>
        {icon ? <span className="field__icon">{icon}</span> : null}
        <input
          ref={ref}
          id={inputId}
          type={visible ? 'text' : 'password'}
          className="field__input"
          {...rest}
        />
        <button
          type="button"
          className="password-input__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.9 5.1A9.7 9.7 0 0 1 12 5c5.5 0 9 5 9 7 0 .7-.5 2-1.7 3.3M6.6 6.6C4.3 8 3 10.2 3 12c0 2 3.5 7 9 7 1.4 0 2.7-.3 3.8-.9" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {error ? (
        <p className="field__message field__message--error">{error}</p>
      ) : helperText ? (
        <p className="field__message">{helperText}</p>
      ) : null}
    </div>
  );
});

export default PasswordInput;
