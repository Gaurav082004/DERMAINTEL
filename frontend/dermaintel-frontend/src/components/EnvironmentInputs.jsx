import './EnvironmentInputs.css';

const STRESS_LABELS = {
  1: 'Relaxed', 2: 'Relaxed', 3: 'Calm', 4: 'Mild',
  5: 'Moderate', 6: 'Moderate', 7: 'Elevated', 8: 'High',
  9: 'Very High', 10: 'Extremely Stressed',
};

function Field({ label, unit, value, onChange, placeholder, min, max, step = '0.1' }) {
  return (
    <label className="env-field">
      <span className="env-field__label">
        {label} {unit && <span className="env-field__unit">({unit})</span>}
      </span>
      <input
        className="env-field__input mono"
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
      />
    </label>
  );
}

export default function EnvironmentInputs({ values, onChange }) {
  const { temperature, humidity, uvIndex, aqiPm25, stress } = values;

  return (
    <div className="env-inputs">
      <div className="env-inputs__grid">
        <Field
          label="Temperature"
          unit="°C"
          value={temperature}
          onChange={(v) => onChange('temperature', v)}
          placeholder="e.g. 28"
          min="-40"
          max="60"
        />
        <Field
          label="Humidity"
          unit="%"
          value={humidity}
          onChange={(v) => onChange('humidity', v)}
          placeholder="e.g. 65"
          min="0"
          max="100"
        />
        <Field
          label="UV Index"
          value={uvIndex}
          onChange={(v) => onChange('uvIndex', v)}
          placeholder="e.g. 7"
          min="0"
          max="20"
        />
        <Field
          label="AQI / PM2.5"
          value={aqiPm25}
          onChange={(v) => onChange('aqiPm25', v)}
          placeholder="e.g. 82"
          min="0"
          max="500"
        />
      </div>

      <div className="env-slider">
        <div className="env-slider__header">
          <span className="env-field__label">Stress (1–10)</span>
          <span className="env-slider__value mono">
            {stress} — {STRESS_LABELS[stress] || ''}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={stress}
          onChange={(e) => onChange('stress', e.target.value)}
          className="env-slider__input"
        />
        <div className="env-slider__scale">
          <span>Relaxed</span>
          <span>Extremely Stressed</span>
        </div>
      </div>
    </div>
  );
}
