import Disclaimer from '../components/Disclaimer';
import './Hero.css';

const PIPELINE = [
  'Skin Image',
  'ResNet50',
  'Classification + Grad-CAM',
  '256-D Features',
];

function scrollToAnalyze() {
  document.getElementById('analyze')?.scrollIntoView({ behavior: 'smooth' });
}

export default function Hero() {
  return (
    <section id="home" className="hero">
      <div className="container hero__inner">
        <span className="eyebrow">Research Prototype</span>
        <h1 className="hero__title">DERMAINTEL</h1>
        <p className="hero__subtitle">Environmental-Context-Aware Dermatological Assessment</p>
        <p className="hero__desc">
          DERMAINTEL combines dermatological image classification, Grad-CAM explainability,
          environmental context, and self-reported stress into a single learned severity
          assessment — built to demonstrate multimodal late-fusion modeling on top of a
          fine-tuned CNN.
        </p>

        <button className="btn btn-primary hero__cta" onClick={scrollToAnalyze}>
          Start Analysis
        </button>

        <div className="hero__pipeline">
          {PIPELINE.map((step, i) => (
            <div key={step} className="hero__pipeline-step">
              <span className="hero__pipeline-index mono">{String(i + 1).padStart(2, '0')}</span>
              <span>{step}</span>
              {i < PIPELINE.length - 1 && <span className="hero__pipeline-arrow">→</span>}
            </div>
          ))}
        </div>
        <div className="hero__pipeline-plus">
          <span>+ Environmental Context</span>
          <span className="hero__pipeline-arrow">→</span>
          <span>MLP</span>
          <span className="hero__pipeline-arrow">→</span>
          <span>Context Score</span>
          <span className="hero__pipeline-arrow">→</span>
          <span>Tier</span>
          <span className="hero__pipeline-arrow">→</span>
          <span>Recommendation</span>
        </div>

        <div className="hero__disclaimer">
          <Disclaimer />
        </div>
      </div>
    </section>
  );
}
