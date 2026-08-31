import { useNavigate } from 'react-router-dom';
import NeuralBackground from '../components/NeuralBackground';
import Reveal from '../components/Reveal';
import Disclaimer from '../components/Disclaimer';
import './Landing.css';

const PROBLEM_CARDS = [
  {
    title: 'Same label, different reality',
    body: 'Two patients with the same CNN-predicted condition can face very different severity depending on climate, air quality, UV exposure, and stress.',
  },
  {
    title: 'Image-only models stop early',
    body: 'A classification label alone doesn\u2019t say how urgent the situation is, or what surrounding conditions are making it worse.',
  },
  {
    title: 'Explanations are often missing',
    body: 'Most classifiers give a label with no visual reasoning attached, leaving the "why" of a prediction opaque.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Upload',
    body: 'Provide a clinical skin photograph and your current environmental context — temperature, humidity, UV index, AQI, and stress.',
  },
  {
    n: '02',
    title: 'AI Analysis',
    body: 'A fine-tuned ResNet50 classifies the image with test-time augmentation, extracts a 256-D feature embedding, and generates a Grad-CAM explanation.',
  },
  {
    n: '03',
    title: 'Context-Aware Report',
    body: 'The image features fuse with your environmental context in an MLP, producing a severity score, a tier, and tailored recommendations.',
  },
];

const TECH = [
  { name: 'ResNet50', desc: 'Fine-tuned CNN backbone for four-class skin condition classification.' },
  { name: 'Grad-CAM', desc: 'Spatial heatmap explaining which image regions drove the prediction.' },
  { name: 'TTA', desc: 'Test-time augmentation across five views, averaged for a steadier prediction.' },
  { name: 'Environmental Fusion', desc: 'Five context variables concatenated with the 256-D image embedding.' },
  { name: 'MLP Regression', desc: 'A 261 \u2192 128 \u2192 64 \u2192 1 network mapping the fused vector to a severity score.' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="container landing-nav__inner">
          <span className="landing-nav__brand">
            <span className="navbar__mark" aria-hidden="true" />
            DERMAINTEL
          </span>
          <button className="btn btn-secondary landing-nav__login" onClick={() => navigate('/login')}>
            Log in
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <NeuralBackground density={50} />
        <div className="container landing-hero__inner">
          <span className="eyebrow">Research Prototype</span>
          <h1 className="landing-hero__title">DERMAINTEL</h1>
          <p className="landing-hero__subtitle">Environmental-Context-Aware Dermatological Assessment</p>
          <p className="landing-hero__desc">
            DERMAINTEL pairs a fine-tuned image classifier with real-world environmental
            context — temperature, humidity, UV, air quality, and stress — to produce a
            severity score, a tier, and an explainable recommendation, not just a label.
          </p>
          <div className="landing-hero__ctas">
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              Start Analysis
            </button>
            <a className="btn btn-secondary" href="#how-it-works">
              See how it works
            </a>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <Reveal as="div" className="section-heading">
            <span className="eyebrow">Why Context Matters</span>
            <h2>Image-only classification isn&rsquo;t the full picture</h2>
          </Reveal>
          <div className="problem-grid">
            {PROBLEM_CARDS.map((c, i) => (
              <Reveal key={c.title} delay={i * 90} className="card problem-card">
                <h4>{c.title}</h4>
                <p>{c.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="landing-section landing-section--tinted">
        <div className="container">
          <Reveal as="div" className="section-heading">
            <span className="eyebrow">How It Works</span>
            <h2>From photo to context-aware report</h2>
          </Reveal>
          <div className="steps-row">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 110} className="step-card">
                <span className="step-card__index mono">{s.n}</span>
                <h4>{s.title}</h4>
                <p>{s.body}</p>
                {i < STEPS.length - 1 && <span className="step-card__arrow" aria-hidden="true">→</span>}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <Reveal as="div" className="section-heading">
            <span className="eyebrow">Under the Hood</span>
            <h2>The pipeline powering every prediction</h2>
          </Reveal>
          <div className="tech-grid">
            {TECH.map((t, i) => (
              <Reveal key={t.name} delay={i * 70} className="card tech-card">
                <span className="tech-card__name mono">{t.name}</span>
                <p>{t.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-cta">
        <div className="container landing-cta__inner">
          <Reveal as="div">
            <h2>See it work on a real image</h2>
            <p>Upload a photo, add your environmental context, and get a full context-aware assessment.</p>
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              Start Analysis
            </button>
          </Reveal>
        </div>
      </section>

      <div className="container landing-disclaimer">
        <Disclaimer />
      </div>

      <footer className="footer">
        <div className="container">
          <span className="footer__brand">DERMAINTEL</span>
          <p>A final-year research prototype for environmental-context-aware dermatological assessment. Not for clinical use.</p>
        </div>
      </footer>
    </div>
  );
}
