import { Link } from 'react-router-dom';
import Container from '../../components/layout/Container';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import StatTile from '../../components/ui/StatTile';
import { IconThermometer, IconDroplet, IconSun, IconCheckCircle, IconLayers, IconEye } from '../../components/ui/icons';

/**
 * LoggedOutView
 * The marketing/introduction landing state: hero, environment status
 * preview card, and the capability stat strip.
 */
export default function LoggedOutView() {
  return (
    <Container>
      <section className="dashboard-hero">
        <div className="dashboard-hero__copy">
          <span className="dashboard-hero__eyebrow">AI-Assisted Skin Analysis</span>
          <h1 className="dashboard-hero__title">
            Understand your skin with AI-assisted analysis.
          </h1>
          <p className="dashboard-hero__description">
            DERMAINTEL combines a convolutional neural network with environmental context —
            temperature, humidity, UV index and reported stress level — to produce an
            AI-assisted analysis of a skin image, along with a Grad-CAM explainability view
            that highlights which regions of the image most influenced the result.
          </p>

          <div className="dashboard-hero__actions">
            <Button as={Link} to="/scan" variant="primary" size="lg">
              Analyze Skin
            </Button>
            <Button as={Link} to="/history" variant="secondary" size="lg">
              View History
            </Button>
          </div>

          <p className="dashboard-hero__disclaimer">
            Research/demo prototype — not a substitute for professional medical advice.
          </p>
        </div>

        <Card className="dashboard-hero__panel" padding="md">
          <div className="dashboard-hero__panel-header">
            <span className="dashboard-hero__panel-title">Environment/Context Status</span>
            <Badge tone="info">DEMO DATA</Badge>
          </div>

          <ul className="dashboard-hero__panel-list">
            <li>
              <span className="dashboard-hero__panel-icon">
                <IconThermometer />
              </span>
              <span className="dashboard-hero__panel-label">Temperature</span>
              <span className="dashboard-hero__panel-value mono">24.0°C</span>
            </li>
            <li>
              <span className="dashboard-hero__panel-icon">
                <IconDroplet />
              </span>
              <span className="dashboard-hero__panel-label">Humidity</span>
              <span className="dashboard-hero__panel-value mono">48% RH</span>
            </li>
            <li>
              <span className="dashboard-hero__panel-icon">
                <IconSun />
              </span>
              <span className="dashboard-hero__panel-label">UV Index</span>
              <span className="dashboard-hero__panel-value mono">5.2</span>
            </li>
          </ul>

          <p className="dashboard-hero__panel-caption">
            Illustrative environmental context factors considered alongside the skin image
            during analysis.
          </p>
        </Card>
      </section>

      <section className="dashboard-stat-strip">
        <StatTile
          icon={<IconCheckCircle />}
          value="84.38%"
          label="CNN accuracy with TTA"
        />
        <StatTile
          icon={<IconLayers />}
          value="256-D"
          label="CNN feature representation"
        />
        <StatTile
          icon={<IconEye />}
          value="Grad-CAM"
          label="Explainability"
        />
      </section>
    </Container>
  );
}
