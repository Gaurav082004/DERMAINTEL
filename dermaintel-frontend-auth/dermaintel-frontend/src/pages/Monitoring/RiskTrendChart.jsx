import './RiskTrendChart.css';

const WIDTH = 700;
const HEIGHT = 260;
const PAD_X = 36;
const PAD_Y = 28;
const MAX_SCORE = 100;
const THRESHOLDS = [
  { value: 34, label: '34 · Moderate' },
  { value: 67, label: '67 · Elevated' },
];

function formatShortDate(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * RiskTrendChart
 * A minimal, dependency-free inline SVG line chart plotting illustrative
 * risk scores (0-100) over time, with Low/Moderate/Elevated threshold
 * guides and tier-colored points. Built by hand rather than pulling in
 * a charting library, since none exists in this project yet.
 */
export default function RiskTrendChart({ points }) {
  if (!points || points.length === 0) {
    return <p className="risk-trend-chart__empty">No data points in this range.</p>;
  }

  const xStep = points.length > 1 ? (WIDTH - PAD_X * 2) / (points.length - 1) : 0;
  const scaleX = (index) => PAD_X + index * xStep;
  const scaleY = (score) => HEIGHT - PAD_Y - (score / MAX_SCORE) * (HEIGHT - PAD_Y * 2);

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${scaleX(index).toFixed(1)} ${scaleY(point.riskScore).toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="risk-trend-chart"
      role="img"
      aria-label="Illustrative risk score trend over time"
    >
      {THRESHOLDS.map((threshold) => (
        <g key={threshold.value}>
          <line
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={scaleY(threshold.value)}
            y2={scaleY(threshold.value)}
            className="risk-trend-chart__threshold"
          />
          <text
            x={WIDTH - PAD_X}
            y={scaleY(threshold.value) - 6}
            textAnchor="end"
            className="risk-trend-chart__threshold-label"
          >
            {threshold.label}
          </text>
        </g>
      ))}

      {points.length > 1 ? <path d={linePath} className="risk-trend-chart__line" /> : null}

      {points.map((point, index) => (
        <g key={point.date}>
          <circle
            cx={scaleX(index)}
            cy={scaleY(point.riskScore)}
            r={5.5}
            className={`risk-trend-chart__dot risk-trend-chart__dot--${point.tier}`}
          />
          <text x={scaleX(index)} y={HEIGHT - 6} textAnchor="middle" className="risk-trend-chart__x-label">
            {formatShortDate(point.date)}
          </text>
        </g>
      ))}
    </svg>
  );
}
