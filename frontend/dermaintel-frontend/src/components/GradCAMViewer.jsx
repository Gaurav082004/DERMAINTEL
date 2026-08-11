import './GradCAMViewer.css';

export default function GradCAMViewer({ originalUrl, gradcam }) {
  return (
    <div className="card result-card">
      <div className="result-card__header">
        <span className="eyebrow">Model Explainability</span>
      </div>

      <div className="gradcam-grid">
        <figure className="gradcam-figure">
          <img src={originalUrl} alt="Original uploaded skin image" />
          <figcaption>Original image</figcaption>
        </figure>

        <figure className="gradcam-figure">
          {gradcam ? (
            <img src={gradcam} alt="Grad-CAM highlighting regions influencing the prediction" />
          ) : (
            <div className="gradcam-fallback">
              <span>Grad-CAM visualization unavailable for this result.</span>
            </div>
          )}
          <figcaption>Grad-CAM</figcaption>
        </figure>
      </div>

      <p className="gradcam-note">
        Highlighted regions indicate areas that contributed most strongly to the model's prediction.
        This does not prove clinical reasoning.
      </p>
    </div>
  );
}
