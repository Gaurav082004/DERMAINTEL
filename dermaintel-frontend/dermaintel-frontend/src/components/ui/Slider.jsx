import { useId } from 'react';
import './Slider.css';

/**
 * Slider
 *
 * A labeled range input with a live mono-styled value readout and
 * optional scale captions underneath (e.g. min/mid/max reference
 * points). Used for the environmental context parameters on the
 * Scan & Analyze page.
 */
export default function Slider({
  label,
  icon,
  value,
  displayValue,
  min,
  max,
  step = 1,
  onChange,
  scaleLabels,
  className = '',
  ...rest
}) {
  const inputId = useId();

  return (
    <div className={['slider-field', className].filter(Boolean).join(' ')}>
      <div className="slider-field__header">
        <label htmlFor={inputId} className="slider-field__label">
          {icon ? <span className="slider-field__icon">{icon}</span> : null}
          {label}
        </label>
        <span className="slider-field__value mono">{displayValue ?? value}</span>
      </div>

      <input
        id={inputId}
        type="range"
        className="slider-field__input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        {...rest}
      />

      {scaleLabels ? (
        <div className="slider-field__scale">
          {scaleLabels.map((item) => (
            <span
              key={item.label}
              className={[
                'slider-field__scale-item',
                item.tone ? `slider-field__scale-item--${item.tone}` : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
