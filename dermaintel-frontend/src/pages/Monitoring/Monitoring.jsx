import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Container from '../../components/layout/Container';
import PageSection from '../../components/layout/PageSection';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import RiskTrendChart from './RiskTrendChart';
import {
  IconThermometer,
  IconDroplet,
  IconSun,
  IconWind,
  IconActivity,
  IconScan,
  IconInbox,
  IconAlertTriangle,
} from '../../components/ui/icons';
import { usePredictionHistory } from '../../api/usePredictionHistory';
import { generateRiskExplanation, normalizeTier, formatTierLabel } from '../../data/analysisData';
import './Monitoring.css';

const RANGE_OPTIONS = ['7D', '30D', '90D', 'All'];
const RANGE_DAYS = { '7D': 7, '30D': 30, '90D': 90 };

function filterByRange(history, rangeKey) {
  if (rangeKey === 'All' || history.length === 0) return history;
  const days = RANGE_DAYS[rangeKey];
  const latest = new Date(history[history.length - 1].date).getTime();
  const cutoff = latest - days * 24 * 60 * 60 * 1000;
  return history.filter((entry) => new Date(entry.date).getTime() >= cutoff);
}

const ENV_METRICS = [
  { key: 'temperature', label: 'Temperature', unit: '°C', icon: IconThermometer, worseWhen: 'up' },
  { key: 'humidity', label: 'Humidity', unit: '% RH', icon: IconDroplet, worseWhen: 'down' },
  { key: 'uvIndex', label: 'UV Index', unit: '', icon: IconSun, worseWhen: 'up' },
  { key: 'aqi', label: 'AQI / PM2.5', unit: '', icon: IconWind, worseWhen: 'up' },
];

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Monitoring
 *
 * Longitudinal view built from the same recorded analyses as
 * Prediction History (GET /api/predictions on the Express backend) —
 * there's no separate monitoring endpoint, so this page derives its
 * trend chart and summaries from that history, ordered chronologically.
 */
export default function Monitoring() {
  const { entries, status, error, reload } = usePredictionHistory();
  const [range, setRange] = useState('30D');

  // The backend returns most-recent-first; the trend chart and
  // before/after comparisons below read left-to-right, oldest first.
  const history = useMemo(
    () =>
      [...entries]
        .filter((entry) => entry.createdAt)
        .reverse()
        .map((entry) => ({
          date: entry.createdAt,
          condition: entry.condition,
          riskScore: Number(entry.severityScore) || 0,
          tier: normalizeTier(entry.tier, entry.severityScore),
          tierLabel: formatTierLabel(entry.tier),
          environment: {
            temperature: entry.environment?.temperature,
            humidity: entry.environment?.humidity,
            uvIndex: entry.environment?.uvIndex,
            aqi: entry.environment?.aqi,
            stress: entry.stress,
          },
        })),
    [entries]
  );

  const filtered = useMemo(() => filterByRange(history, range), [history, range]);

  if (status === 'loading') {
    return (
      <Container>
        <PageSection
          eyebrow="Trends"
          title="Longitudinal Monitoring"
          description="Risk trajectory and environmental correlation across recorded analyses."
        />
        <Card padding="lg">
          <p className="monitoring-status-text">Loading monitoring data…</p>
        </Card>
      </Container>
    );
  }

  if (status === 'error') {
    return (
      <Container>
        <PageSection
          eyebrow="Trends"
          title="Longitudinal Monitoring"
          description="Risk trajectory and environmental correlation across recorded analyses."
        />
        <Card padding="lg">
          <EmptyState
            icon={<IconAlertTriangle />}
            title="Couldn't load monitoring data"
            description={error}
            action={
              <Button variant="primary" onClick={reload}>
                Try Again
              </Button>
            }
          />
        </Card>
      </Container>
    );
  }

  if (history.length === 0) {
    return (
      <Container>
        <PageSection
          eyebrow="Trends"
          title="Longitudinal Monitoring"
          description="Risk trajectory and environmental correlation across recorded analyses."
        />
        <Card padding="lg">
          <EmptyState
            icon={<IconInbox />}
            title="No analyses recorded yet"
            description="Run at least one analysis from Scan & Analyze to start building a trend here."
            action={
              <Button as={Link} to="/scan" variant="primary" iconLeft={<IconScan />}>
                Go to Scan &amp; Analyze
              </Button>
            }
          />
        </Card>
      </Container>
    );
  }

  const latest = history[history.length - 1];
  const first = history[0];

  return (
    <Container>
      <PageSection
        eyebrow="Trends"
        title="Longitudinal Monitoring"
        description="Risk trajectory and environmental correlation across recorded analyses."
      />

      <Card padding="md" className="monitoring-disclaimer">
        <p>
          This trajectory is built from analyses recorded by the backend. Risk scores and tiers are the DERMAINTEL
          MLP model's illustrative output, not a clinical assessment.
        </p>
      </Card>

      <div className="monitoring-grid">
        <Card eyebrow="Most Recent" title="Latest Analysis" padding="lg" className="monitoring-latest">
          <div className="monitoring-latest__headline">
            <span className="monitoring-latest__condition">{latest.condition}</span>
            <Badge tone={latest.tier}>{latest.tierLabel} Risk</Badge>
          </div>
          <div className="monitoring-latest__score mono">
            {latest.riskScore}
            <span className="monitoring-latest__score-max">/100</span>
          </div>
          <p className="monitoring-latest__date mono">{formatDate(latest.date)}</p>

          <div className="monitoring-latest__chips">
            <span className="monitoring-chip mono">{latest.environment.temperature}°C</span>
            <span className="monitoring-chip mono">{latest.environment.humidity}% RH</span>
            <span className="monitoring-chip mono">UV {latest.environment.uvIndex}</span>
            <span className="monitoring-chip mono">AQI {latest.environment.aqi}</span>
            <span className="monitoring-chip mono">Stress {latest.environment.stress}/10</span>
          </div>

          <Button as={Link} to="/scan" variant="secondary" size="sm" iconLeft={<IconScan />} className="monitoring-latest__cta">
            Run New Analysis
          </Button>
        </Card>

        <Card
          eyebrow="Risk Trend"
          title="Risk Trajectory (0-100)"
          padding="lg"
          className="monitoring-chart-card"
          action={
            <div className="monitoring-range" role="group" aria-label="Time range">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={['monitoring-range__btn', range === option ? 'is-active' : ''].filter(Boolean).join(' ')}
                  onClick={() => setRange(option)}
                  aria-pressed={range === option}
                >
                  {option}
                </button>
              ))}
            </div>
          }
        >
          <RiskTrendChart points={filtered} />
          <div className="monitoring-legend">
            <span className="monitoring-legend__item">
              <span className="monitoring-legend__dot monitoring-legend__dot--low" /> Low
            </span>
            <span className="monitoring-legend__item">
              <span className="monitoring-legend__dot monitoring-legend__dot--moderate" /> Moderate
            </span>
            <span className="monitoring-legend__item">
              <span className="monitoring-legend__dot monitoring-legend__dot--elevated" /> Elevated
            </span>
          </div>
        </Card>
      </div>

      <PageSection
        eyebrow="Context"
        title="Environmental Context Trend"
        description="How the recorded ambient factors have shifted between the earliest and most recent analyses shown above."
      >
        <div className="monitoring-env-grid">
          {ENV_METRICS.map((metric) => {
            const startValue = first.environment[metric.key];
            const endValue = latest.environment[metric.key];
            const delta =
              Number.isFinite(Number(startValue)) && Number.isFinite(Number(endValue))
                ? Math.round((Number(endValue) - Number(startValue)) * 10) / 10
                : null;
            const isWorse = metric.worseWhen === 'up' ? delta > 0 : delta < 0;
            const isBetter = metric.worseWhen === 'up' ? delta < 0 : delta > 0;
            const tone = delta === null ? 'neutral' : isWorse ? 'elevated' : isBetter ? 'low' : 'neutral';
            const Icon = metric.icon;

            return (
              <Card key={metric.key} padding="md" className="monitoring-env-card">
                <div className="monitoring-env-card__header">
                  <span className="monitoring-env-card__icon">
                    <Icon />
                  </span>
                  <span className="monitoring-env-card__label">{metric.label}</span>
                </div>
                <div className="monitoring-env-card__values mono">
                  {startValue ?? '—'}
                  {metric.unit} <span className="monitoring-env-card__arrow">→</span> {endValue ?? '—'}
                  {metric.unit}
                </div>
                <Badge tone={tone}>
                  {delta === null ? 'No change data' : `${delta > 0 ? '+' : ''}${delta}${metric.unit} over range`}
                </Badge>
              </Card>
            );
          })}

          <Card padding="md" className="monitoring-env-card">
            <div className="monitoring-env-card__header">
              <span className="monitoring-env-card__icon">
                <IconActivity />
              </span>
              <span className="monitoring-env-card__label">Stress Level</span>
            </div>
            <div className="monitoring-env-card__values mono">
              {first.environment.stress}/10 <span className="monitoring-env-card__arrow">→</span>{' '}
              {latest.environment.stress}/10
            </div>
            <Badge tone={first.environment.stress === latest.environment.stress ? 'neutral' : 'elevated'}>
              {first.environment.stress === latest.environment.stress ? 'Unchanged' : 'Changed'} over range
            </Badge>
          </Card>
        </div>
      </PageSection>

      <PageSection
        eyebrow="Notes"
        title="Historical Observations"
        description="A plain-language summary generated from the recorded history above."
      >
        <Card padding="lg">
          <ul className="monitoring-observations">
            <li>
              Risk score moved from <strong className="mono">{first.riskScore}/100</strong> ({first.tierLabel}) to{' '}
              <strong className="mono">{latest.riskScore}/100</strong> ({latest.tierLabel}) across the recorded
              period.
            </li>
            <li>{generateRiskExplanation(latest.environment, latest.tier)}</li>
            <li>
              Reported stress level shifted from <strong>{first.environment.stress}/10</strong> to{' '}
              <strong>{latest.environment.stress}/10</strong> over the same period.
            </li>
            <li>
              The most recent predicted condition is <strong>{latest.condition}</strong>.
            </li>
          </ul>
        </Card>
      </PageSection>
    </Container>
  );
}
