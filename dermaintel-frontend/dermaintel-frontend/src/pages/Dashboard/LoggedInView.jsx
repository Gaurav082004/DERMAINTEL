import { Link } from 'react-router-dom';
import Container from '../../components/layout/Container';
import PageSection from '../../components/layout/PageSection';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import StatTile from '../../components/ui/StatTile';
import FeatureCard from '../../components/ui/FeatureCard';
import EmptyState from '../../components/ui/EmptyState';
import {
  IconActivity,
  IconScan,
  IconInbox,
  IconClipboard,
  IconThermometer,
  IconDroplet,
  IconSun,
  IconWind,
  IconCheckCircle,
  IconLayers,
  IconEye,
} from '../../components/ui/icons';

/**
 * LoggedInView
 * The signed-in overview state. No backend exists yet, so every
 * section either shows a genuine empty state (nothing has happened
 * yet) or clearly labeled DEMO DATA — never invented patient data.
 */
export default function LoggedInView() {
  return (
    <Container>
      <PageSection
        eyebrow="Overview"
        title="Analysis overview"
        description="A summary of your AI-assisted skin analyses. This will populate once analyses have been run."
      >
        <div className="dashboard-overview-grid">
          <StatTile
            icon={<IconActivity />}
            value="0"
            label="Total AI-assisted analyses"
            helper="No analyses run yet"
          />
          <StatTile
            icon={<IconClipboard />}
            value="—"
            label="Latest analysis result"
            helper="Run an analysis to populate this"
          />
          <StatTile
            icon={<IconThermometer />}
            value="—"
            label="Environmental context"
            helper="Recorded automatically during analysis"
          />
          <StatTile
            icon={<IconInbox />}
            value="0"
            label="Recommendations available"
            helper="Generated after your first analysis"
          />
        </div>
      </PageSection>

      <PageSection eyebrow="Activity" title="Recent AI-assisted analyses">
        <Card padding="lg">
          <EmptyState
            icon={<IconScan />}
            title="No analyses yet"
            description="Once you run an AI-assisted skin analysis, it will appear here with its result and environmental context."
            action={
              <Button as={Link} to="/scan" variant="primary" size="sm">
                Start New Analysis
              </Button>
            }
          />
        </Card>
      </PageSection>

      <PageSection
        eyebrow="Context"
        title="Environment/context summary"
        description="The kinds of ambient factors DERMAINTEL takes into account alongside the skin image."
        action={<Badge tone="info">DEMO DATA</Badge>}
      >
        <Card padding="lg">
          <div className="dashboard-env-grid">
            <div className="dashboard-env-item">
              <span className="dashboard-env-icon">
                <IconThermometer />
              </span>
              <div>
                <div className="dashboard-env-value mono">24.0°C</div>
                <div className="dashboard-env-label">Temperature</div>
              </div>
            </div>
            <div className="dashboard-env-item">
              <span className="dashboard-env-icon">
                <IconDroplet />
              </span>
              <div>
                <div className="dashboard-env-value mono">48% RH</div>
                <div className="dashboard-env-label">Humidity</div>
              </div>
            </div>
            <div className="dashboard-env-item">
              <span className="dashboard-env-icon">
                <IconSun />
              </span>
              <div>
                <div className="dashboard-env-value mono">UV 5.2</div>
                <div className="dashboard-env-label">UV Index</div>
              </div>
            </div>
            <div className="dashboard-env-item">
              <span className="dashboard-env-icon">
                <IconWind />
              </span>
              <div>
                <div className="dashboard-env-value mono">AQI 42</div>
                <div className="dashboard-env-label">Air Quality Index</div>
              </div>
            </div>
          </div>
          <p className="dashboard-env-caption">
            Illustrative values shown for layout purposes only. Real environmental context will
            be captured on the Scan &amp; Analyze page once available.
          </p>
        </Card>
      </PageSection>

      <PageSection>
        <Card padding="lg" className="dashboard-cta-card">
          <div className="dashboard-cta-card__copy">
            <h3 className="dashboard-cta-card__title">Ready for your next analysis?</h3>
            <p className="dashboard-cta-card__description">
              Upload a skin image and set the environmental context to run a new AI-assisted
              analysis.
            </p>
          </div>
          <Button as={Link} to="/scan" variant="primary" size="lg">
            Start New Analysis
          </Button>
        </Card>
      </PageSection>

      <PageSection
        eyebrow="Records"
        title="Recent prediction history"
        action={
          <Button as={Link} to="/history" variant="ghost" size="sm">
            View full history
          </Button>
        }
      >
        <Card padding="lg">
          <EmptyState
            icon={<IconInbox />}
            title="No predictions yet"
            description="Your AI-assisted analyses will be listed here once you've run them, along with their environmental context."
          />
        </Card>
      </PageSection>

      <PageSection
        eyebrow="How it works"
        title="DERMAINTEL architecture"
        description="An overview of how the analysis pipeline is put together."
      >
        <div className="dashboard-feature-grid">
          <FeatureCard
            icon={<IconLayers />}
            title="CNN Vision"
            description="A convolutional neural network extracts a 256-D feature representation from the uploaded skin image."
          />
          <FeatureCard
            icon={<IconThermometer />}
            title="Environmental Context Fusion"
            description="Ambient factors — temperature, humidity, UV index and reported stress level — are combined with the image-based features."
          />
          <FeatureCard
            icon={<IconEye />}
            title="Grad-CAM Explainability"
            description="Gradient-based attention maps highlight the image regions that most influenced the model's output."
          />
          <FeatureCard
            icon={<IconCheckCircle />}
            title="TTA-Evaluated Accuracy"
            description="Model performance is measured using test-time augmentation, reaching 84.38% CNN accuracy on evaluation data."
          />
        </div>
      </PageSection>
    </Container>
  );
}
