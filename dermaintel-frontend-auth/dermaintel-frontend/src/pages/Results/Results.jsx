import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Container from '../../components/layout/Container';
import PageSection from '../../components/layout/PageSection';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import ExplainabilityViewer from './ExplainabilityViewer';
import {
  IconScan,
  IconThermometer,
  IconDroplet,
  IconSun,
  IconWind,
  IconActivity,
  IconClipboard,
  IconInbox,
  IconCheckCircle,
} from '../../components/ui/icons';
import {
  conditionTone,
  generateRiskExplanation,
  normalizeTier,
  formatTierLabel,
  formatConfidence,
  SUPPORTED_CONDITIONS,
} from '../../data/analysisData';
import './Results.css';

/**
 * Best-effort, generic text for one entry of the backend's
 * `recommendation` array. The backend contract doesn't pin down
 * whether entries are plain strings or objects, so this renders
 * whatever is actually there without inventing categories, tags, or
 * other fields that aren't in the response.
 */
function recommendationText(item) {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const candidate = item.text ?? item.title ?? item.message ?? item.description ?? item.recommendation;
    if (typeof candidate === 'string') return candidate;
    try {
      return JSON.stringify(item);
    } catch {
      return String(item);
    }
  }
  return String(item);
}

/**
 * Results
 *
 * Renders the real prediction returned by the Express backend
 * (POST /api/predict), handed off via router state from the
 * Processing page — or, when reached from Prediction History's
 * "View" action, a previously recorded entry from GET
 * /api/predictions. If neither is present (e.g. this route was
 * opened directly), shows an empty state instead of fabricating a
 * result.
 */
export default function Results() {
  const location = useLocation();
  const { data, image } = location.state ?? {};
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const receivedAt = useMemo(() => data?.createdAt ?? new Date().toISOString(), [data]);

  if (!data) {
    return (
      <Container>
        <PageSection
          eyebrow="Report"
          title="Analysis Results"
          description="Classification, risk score, model explanation, and recommendations from a submitted skin image."
        />
        <Card padding="lg">
          <EmptyState
            icon={<IconInbox />}
            title="No analysis to show"
            description="Run a new analysis from Scan & Analyze, or open a past result from Prediction History."
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

  const condition = data.condition;
  const confidence = formatConfidence(data.confidence);
  const riskScore = Number(data.severityScore);
  const clampedScore = Number.isFinite(riskScore) ? Math.min(100, Math.max(0, riskScore)) : 0;
  const tierRaw = data.tier;
  const tierTone = normalizeTier(tierRaw, riskScore);
  const environment = {
    temperature: data.environment?.temperature,
    humidity: data.environment?.humidity,
    uvIndex: data.environment?.uvIndex,
    aqi: data.environment?.aqi,
    stress: data.stress,
  };
  const recommendations = Array.isArray(data.recommendation) ? data.recommendation : [];
  const swatchTone = conditionTone(condition);

  const analyzedLabel = new Date(receivedAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Container>
      <PageSection
        eyebrow="Report"
        title="Analysis Results"
        description="Classification, risk score, model explanation, and recommendations from the submitted skin image."
        action={
          <Button as={Link} to="/scan" variant="primary" iconLeft={<IconScan />}>
            New Analysis
          </Button>
        }
      />

      <div className="results-meta">
        <span className="results-meta__item mono">Analyzed: {analyzedLabel}</span>
        {Number.isFinite(Number(data.processingTimeMs)) ? (
          <span className="results-meta__item mono">Processed in {Math.round(Number(data.processingTimeMs))} ms</span>
        ) : null}
        {data.ttaApplied ? (
          <Badge tone="accent" dot>
            <IconCheckCircle width={12} height={12} /> TTA Applied
          </Badge>
        ) : null}
      </div>

      <Card padding="md" className="results-disclaimer">
        <span className="results-disclaimer__label">Research Prototype Disclaimer</span>
        <p className="results-disclaimer__text">
          DERMAINTEL is a research prototype for AI-assisted skin analysis. It does not replace a professional
          dermatological examination, and this result is not a medical diagnosis. Consult a licensed clinician for
          any health concerns.
        </p>
      </Card>

      <div className="results-grid">
        <div className="results-col">
          <Card eyebrow="Submitted Image" title="Skin Image" padding="lg">
            <div className="results-image">
              {previewUrl ? (
                <img src={previewUrl} alt="Submitted skin scan" className="results-image__photo" />
              ) : (
                <div className={`results-image__swatch results-image__swatch--${swatchTone}`} aria-hidden="true" />
              )}
              <div className="results-image__meta">
                <div className="results-image__name">{image ? image.name : 'Original image not stored'}</div>
                <p className="results-image__caption">
                  {image
                    ? 'This preview is generated locally and is not retained after navigating away.'
                    : 'The backend does not persist the original uploaded image, so it cannot be shown for a past result.'}
                </p>
              </div>
            </div>
          </Card>

          <Card eyebrow="Classification" title="Predicted Condition" padding="lg">
            <div className="results-condition">
              <h3 className="results-condition__name">{condition}</h3>
              <div className="results-confidence">
                <div className="results-confidence__header">
                  <span>Model Decision Confidence</span>
                  <span className="mono results-confidence__value">
                    {confidence !== null ? `${confidence.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="results-confidence__track">
                  <div
                    className="results-confidence__fill"
                    style={{ width: `${confidence !== null ? Math.min(100, Math.max(0, confidence)) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="results-supported">
              <span className="results-supported__label">Supported Conditions</span>
              <div className="results-supported__list">
                {SUPPORTED_CONDITIONS.map((item) => (
                  <Badge key={item} tone={item === condition ? conditionTone(item) : 'neutral'}>
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>

          <Card eyebrow="Risk" title="Risk / Severity Score" padding="lg">
            <div className="results-risk">
              <div className="results-risk__headline">
                <div className="results-risk__score mono">
                  {Number.isFinite(riskScore) ? Math.round(riskScore) : '—'}
                  <span className="results-risk__score-max">/100</span>
                </div>
                <Badge tone={tierTone}>{formatTierLabel(tierRaw)} Risk</Badge>
              </div>

              <div className="results-risk__bar-track">
                <span className="results-risk__bar-segment results-risk__bar-segment--low" />
                <span className="results-risk__bar-segment results-risk__bar-segment--moderate" />
                <span className="results-risk__bar-segment results-risk__bar-segment--elevated" />
                <span className="results-risk__bar-marker" style={{ left: `${clampedScore}%` }} />
              </div>
              <div className="results-risk__bar-scale mono">
                <span>0 · Low</span>
                <span>34 · Moderate</span>
                <span>67 · Elevated</span>
              </div>

              <p className="results-risk__explanation">{generateRiskExplanation(environment, tierTone)}</p>
              <p className="results-risk__note">
                This score and tier come directly from the DERMAINTEL MLP risk model. It is illustrative only and is
                not a clinical severity assessment.
              </p>
            </div>
          </Card>
        </div>

        <div className="results-col">
          <Card eyebrow="Context" title="Environmental Context Summary" padding="lg">
            <div className="results-env-grid">
              <div className="results-env-item">
                <span className="results-env-icon">
                  <IconThermometer />
                </span>
                <div>
                  <div className="results-env-value mono">{environment.temperature}°C</div>
                  <div className="results-env-label">Temperature</div>
                </div>
              </div>
              <div className="results-env-item">
                <span className="results-env-icon">
                  <IconDroplet />
                </span>
                <div>
                  <div className="results-env-value mono">{environment.humidity}% RH</div>
                  <div className="results-env-label">Humidity</div>
                </div>
              </div>
              <div className="results-env-item">
                <span className="results-env-icon">
                  <IconSun />
                </span>
                <div>
                  <div className="results-env-value mono">UV {environment.uvIndex}</div>
                  <div className="results-env-label">UV Index</div>
                </div>
              </div>
              <div className="results-env-item">
                <span className="results-env-icon">
                  <IconWind />
                </span>
                <div>
                  <div className="results-env-value mono">AQI {environment.aqi}</div>
                  <div className="results-env-label">Air Quality Index</div>
                </div>
              </div>
              <div className="results-env-item">
                <span className="results-env-icon">
                  <IconActivity />
                </span>
                <div>
                  <div className="results-env-value mono">{environment.stress}/10</div>
                  <div className="results-env-label">Stress Level</div>
                </div>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <ExplainabilityViewer
              imageSrc={previewUrl}
              gradcamSrc={data.gradcam || null}
              swatchTone={swatchTone}
              conditionLabel={condition}
            />
          </Card>
        </div>
      </div>

      <PageSection
        eyebrow="Guidance"
        title="Recommendations"
        description="Recommendations returned by the DERMAINTEL backend for the predicted condition and risk tier. Not a substitute for professional dermatological care."
      >
        {recommendations.length > 0 ? (
          <div className="results-recommend-grid">
            {recommendations.map((item, index) => (
              <Card key={index} padding="md" className="results-recommend-card">
                <div className="results-recommend-card__header">
                  <span className="results-recommend-card__icon">
                    <IconClipboard />
                  </span>
                </div>
                <p className="results-recommend-card__description">{recommendationText(item)}</p>
              </Card>
            ))}
          </div>
        ) : (
          <Card padding="lg">
            <p className="results-recommend-empty">The backend did not return any recommendations for this result.</p>
          </Card>
        )}
      </PageSection>
    </Container>
  );
}
