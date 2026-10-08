import Container from '../../components/layout/Container';
import PageSection from '../../components/layout/PageSection';
import Card from '../../components/ui/Card';
import StatTile from '../../components/ui/StatTile';
import FeatureCard from '../../components/ui/FeatureCard';
import {
  IconUpload,
  IconScan,
  IconServer,
  IconCpu,
  IconGrid,
  IconLayers,
  IconThermometer,
  IconTarget,
  IconClipboard,
  IconEye,
  IconHistory,
  IconDroplet,
  IconSun,
  IconWind,
  IconActivity,
  IconCheckCircle,
} from '../../components/ui/icons';
import { SUPPORTED_CONDITIONS, CONDITION_TONE } from '../../data/analysisData';
import './Pipeline.css';

const PIPELINE_STEPS = [
  {
    title: 'User Image',
    description: 'A skin image is selected or uploaded on the Scan & Analyze page, along with the current environmental context.',
    icon: IconUpload,
  },
  {
    title: 'React Frontend',
    description: 'This interface — built with React and Vite — collects the image and context inputs and prepares them for analysis.',
    icon: IconScan,
  },
  {
    title: 'Express Backend',
    description: 'A Node.js/Express backend receives the submission and routes it to the machine learning service.',
    icon: IconServer,
  },
  {
    title: 'Flask ML API',
    description: 'A Python Flask API exposes the trained model and handles inference requests from the backend.',
    icon: IconServer,
  },
  {
    title: 'ResNet50 CNN',
    description: 'A ResNet50 convolutional neural network processes the submitted image.',
    icon: IconCpu,
  },
  {
    title: '4-Class Skin Condition Classification',
    description: 'The CNN classifies the image as Acne, Alopecia, Eczema, or Healthy Skin.',
    icon: IconGrid,
  },
  {
    title: '256-D CNN Feature Extraction',
    description: 'A 256-dimensional feature representation is extracted from the CNN for use alongside environmental data.',
    icon: IconLayers,
  },
  {
    title: 'Environmental + Context Features',
    description: 'Temperature, Humidity, UV Index, AQI/PM2.5, and reported Stress level are combined with the CNN features.',
    icon: IconThermometer,
  },
  {
    title: 'MLP Risk/Severity Estimation',
    description: 'A multi-layer perceptron (MLP) combines the CNN and environmental features into an illustrative risk/severity score.',
    icon: IconTarget,
  },
  {
    title: 'Risk Mapping + Recommendations',
    description: 'The score is mapped to a risk tier (Low / Moderate / Elevated) and used to generate general skincare and lifestyle recommendations.',
    icon: IconClipboard,
  },
  {
    title: 'Grad-CAM Explainability',
    description: "Grad-CAM highlights the image regions that most influenced the CNN's classification — a model explanation, not proof of diagnosis.",
    icon: IconEye,
  },
  {
    title: 'Prediction History',
    description: 'The result is recorded so it can be reviewed later in Prediction History and tracked over time in Monitoring.',
    icon: IconHistory,
  },
];

const CONDITION_DESCRIPTIONS = {
  Acne: 'Inflammatory acne-related skin presentations.',
  Alopecia: 'Localized or patterned hair-loss presentations.',
  Eczema: 'Dry, inflamed, or irritated eczema-type presentations.',
  'Healthy Skin': 'Skin showing none of the other three categories.',
};

const CONTEXT_INPUTS = [
  { label: 'Temperature', icon: IconThermometer },
  { label: 'Humidity', icon: IconDroplet },
  { label: 'UV Index', icon: IconSun },
  { label: 'AQI / PM2.5', icon: IconWind },
  { label: 'Stress', icon: IconActivity },
];

/**
 * Pipeline
 *
 * A purely informational walkthrough of DERMAINTEL's intended
 * end-to-end architecture. Nothing on this page calls an API, runs a
 * model, or performs real inference — the frontend here has no
 * backend connection. Steps like "Express Backend" and "Flask ML API"
 * describe the project's overall design, not code running in this
 * React application.
 */
export default function Pipeline() {
  return (
    <Container>
      <PageSection
        eyebrow="Architecture"
        title="How DERMAINTEL Works"
        description="An overview of the AI-assisted analysis pipeline, from image capture through to explainable, illustrative results."
      />

      <Card padding="md" className="pipeline-disclaimer">
        <span className="pipeline-disclaimer__label">Research Prototype Disclaimer</span>
        <p className="pipeline-disclaimer__text">
          DERMAINTEL is an AI-assisted research prototype for skin condition classification and illustrative risk
          estimation. It is not a diagnostic device and does not replace examination by a licensed dermatologist or
          other qualified clinician.
        </p>
      </Card>

      <div className="pipeline-stats">
        <StatTile icon={<IconCheckCircle />} value="84.38%" label="CNN accuracy with TTA" />
        <StatTile icon={<IconLayers />} value="256-D" label="CNN feature representation" />
        <StatTile icon={<IconGrid />} value="4" label="Supported skin conditions" />
        <StatTile icon={<IconThermometer />} value="5" label="Environmental / context inputs" />
      </div>

      <PageSection
        eyebrow="Pipeline"
        title="Analysis Pipeline"
        description="The stages an image and its environmental context pass through, end to end."
      >
        <div className="pipeline-flow">
          {PIPELINE_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === PIPELINE_STEPS.length - 1;
            return (
              <div className="pipeline-step" key={step.title}>
                <div className="pipeline-step__marker">
                  <span className="pipeline-step__icon">
                    <Icon />
                  </span>
                  {!isLast ? <span className="pipeline-step__connector" aria-hidden="true" /> : null}
                </div>
                <div className="pipeline-step__body">
                  <span className="pipeline-step__index mono">STEP {String(index + 1).padStart(2, '0')}</span>
                  <h4 className="pipeline-step__title">{step.title}</h4>
                  <p className="pipeline-step__description">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Classification"
        title="Supported Skin Conditions"
        description="DERMAINTEL's CNN is trained to classify a submitted image into one of four categories."
      >
        <div className="pipeline-conditions-grid">
          {SUPPORTED_CONDITIONS.map((condition) => (
            <FeatureCard
              key={condition}
              icon={<span className={`pipeline-condition-dot pipeline-condition-dot--${CONDITION_TONE[condition]}`} />}
              title={condition}
              description={CONDITION_DESCRIPTIONS[condition]}
            />
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Context"
        title="Environmental & Contextual Inputs"
        description="These ambient factors are combined with the image-based CNN features before risk estimation."
      >
        <div className="pipeline-context-grid">
          {CONTEXT_INPUTS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="pipeline-context-chip">
                <span className="pipeline-context-chip__icon">
                  <Icon />
                </span>
                <span className="pipeline-context-chip__label">{item.label}</span>
              </div>
            );
          })}
        </div>
      </PageSection>
    </Container>
  );
}
