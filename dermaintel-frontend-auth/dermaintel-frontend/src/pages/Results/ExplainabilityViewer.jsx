import { useState } from 'react';
import Badge from '../../components/ui/Badge';
import './ExplainabilityViewer.css';

const MODES = [
  { id: 'split', label: 'Split Slider' },
  { id: 'blend', label: 'Blended Overlay' },
  { id: 'side', label: 'Side-by-Side' },
];

/**
 * ExplainabilityViewer
 *
 * Presents the model's real Grad-CAM overlay (a base64 PNG data URI
 * returned by Flask's /predict, forwarded through Express untouched)
 * next to the submitted image. If Grad-CAM generation failed
 * server-side — app.py treats it as best-effort and returns
 * gradcam: null in that case — this falls back to just showing the
 * submitted image with a note that no overlay is available for this
 * result, rather than fabricating one.
 */
export default function ExplainabilityViewer({ imageSrc, gradcamSrc, swatchTone, conditionLabel }) {
  const [mode, setMode] = useState('split');
  const [split, setSplit] = useState(50);

  const baseLayer = imageSrc ? (
    <img src={imageSrc} alt="Submitted skin image" className="explain-viewer__image" />
  ) : (
    <div className={`explain-viewer__swatch explain-viewer__swatch--${swatchTone}`} aria-hidden="true" />
  );

  const overlayLayer = gradcamSrc ? (
    <img src={gradcamSrc} alt="Grad-CAM attention overlay" className="explain-viewer__gradcam" />
  ) : null;

  return (
    <div className="explain-viewer">
      <div className="explain-viewer__header">
        <div className="explain-viewer__heading">
          <span className="explain-viewer__title">Grad-CAM Explanation</span>
          <Badge tone="neutral" className="mono">
            ResNet50
          </Badge>
        </div>
        {gradcamSrc ? (
          <div className="explain-viewer__modes" role="group" aria-label="Explanation view mode">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={['explain-viewer__mode-btn', mode === item.id ? 'is-active' : ''].filter(Boolean).join(' ')}
                onClick={() => setMode(item.id)}
                aria-pressed={mode === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p className="explain-viewer__description">
        {gradcamSrc ? (
          <>
            Highlights the image regions that most influenced the <strong>{conditionLabel}</strong> classification.
            A model explanation, not proof of diagnosis.
          </>
        ) : (
          <>Grad-CAM overlay generation was unavailable for this result, so only the submitted image is shown.</>
        )}
      </p>

      {gradcamSrc ? (
        <div className={`explain-viewer__stage explain-viewer__stage--${mode}`}>
          {mode === 'side' ? (
            <>
              <div className="explain-viewer__pane">
                <span className="explain-viewer__pane-label">Grad-CAM Overlay</span>
                <div className="explain-viewer__frame">{overlayLayer}</div>
              </div>
              <div className="explain-viewer__pane">
                <span className="explain-viewer__pane-label">Original Image</span>
                <div className="explain-viewer__frame">{baseLayer}</div>
              </div>
            </>
          ) : mode === 'blend' ? (
            <div className="explain-viewer__frame explain-viewer__frame--wide">
              {baseLayer}
              <div className="explain-viewer__gradcam-layer explain-viewer__gradcam-layer--blend">{overlayLayer}</div>
            </div>
          ) : (
            <div className="explain-viewer__frame explain-viewer__frame--wide">
              {baseLayer}
              <div
                className="explain-viewer__gradcam-layer"
                style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
              >
                {overlayLayer}
              </div>
              <div className="explain-viewer__divider" style={{ left: `${split}%` }} aria-hidden="true" />
              <input
                type="range"
                className="explain-viewer__slider"
                min={0}
                max={100}
                value={split}
                onChange={(event) => setSplit(Number(event.target.value))}
                aria-label="Reveal Grad-CAM overlay"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="explain-viewer__stage">
          <div className="explain-viewer__frame explain-viewer__frame--wide">{baseLayer}</div>
        </div>
      )}

      {gradcamSrc && mode === 'split' ? (
        <p className="explain-viewer__hint">Drag the slider to compare the Grad-CAM overlay against the original image.</p>
      ) : null}
    </div>
  );
}
