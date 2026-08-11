import { useState, useEffect, useRef } from 'react';
import ImageUploader from '../components/ImageUploader';
import EnvironmentInputs from '../components/EnvironmentInputs';
import AnalysisButton from '../components/AnalysisButton';
import ErrorCard from '../components/ErrorCard';
import ClassificationResult from '../components/ClassificationResult';
import GradCAMViewer from '../components/GradCAMViewer';
import EnvironmentCard from '../components/EnvironmentCard';
import SeverityCard from '../components/SeverityCard';
import RecommendationCard from '../components/RecommendationCard';
import { runPrediction } from '../services/api';
import './Analysis.css';

const INITIAL_VALUES = { temperature: '', humidity: '', uvIndex: '', aqiPm25: '', stress: 5 };

export default function Analysis({ onNewResult }) {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function handleSelectImage(file) {
    setImage(file);
    setResult(null);
    setError(null);
  }

  function handleRemoveImage() {
    setImage(null);
    setResult(null);
  }

  function handleValueChange(key, val) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  const allFieldsFilled =
    image &&
    values.temperature !== '' &&
    values.humidity !== '' &&
    values.uvIndex !== '' &&
    values.aqiPm25 !== '' &&
    values.stress !== '';

  async function handleAnalyze() {
    if (!allFieldsFilled || loading) return;
    setLoading(true);
    setError(null);

    try {
      const data = await runPrediction({
        image,
        temperature: values.temperature,
        humidity: values.humidity,
        uvIndex: values.uvIndex,
        aqiPm25: values.aqiPm25,
        stress: values.stress,
      });
      setResult(data);
      onNewResult?.();
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const rejected = result?.ood?.is_ood;

  return (
    <section id="analyze" className="analysis">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Analysis Dashboard</span>
          <h2>Run a prediction</h2>
          <p>Upload a skin image and provide the environmental context for the assessment.</p>
        </div>

        <div className="analysis__grid">
          {/* LEFT — INPUTS */}
          <div className="card analysis__panel">
            <h3 className="analysis__panel-title">Analysis Inputs</h3>

            <ImageUploader
              image={image}
              previewUrl={previewUrl}
              onSelect={handleSelectImage}
              onRemove={handleRemoveImage}
              error={uploadError}
              setError={setUploadError}
            />

            <div className="analysis__divider" />

            <EnvironmentInputs values={values} onChange={handleValueChange} />

            <ErrorCard message={error} onDismiss={() => setError(null)} />

            <AnalysisButton disabled={!allFieldsFilled} loading={loading} onClick={handleAnalyze} />

            {!allFieldsFilled && !loading && (
              <p className="analysis__hint">Add an image and all five values to enable analysis.</p>
            )}
          </div>

          {/* RIGHT — RESULTS */}
          <div className="analysis__results" ref={resultsRef}>
            {!result && !loading && (
              <div className="card analysis__empty">
                <p>Your results will appear here once analysis is complete.</p>
              </div>
            )}

            {loading && (
              <div className="card analysis__empty">
                <span className="spinner spinner--dark" aria-hidden="true" />
                <p>Running the DermaIntel pipeline — this can take several seconds.</p>
              </div>
            )}

            {result && rejected && (
              <div className="card analysis__rejected">
                <span className="eyebrow">Image Not Accepted</span>
                <p>{result.ood?.reason || 'The uploaded image was rejected by the model.'}</p>
                <p className="analysis__rejected-note">
                  A severity result is not shown for rejected images. Try a clearer, well-lit
                  photo of the affected skin area.
                </p>
              </div>
            )}

            {result && !rejected && (
              <>
                <ClassificationResult
                  condition={result.condition}
                  confidence={result.confidence}
                  ttaApplied={result.ttaApplied}
                />
                <GradCAMViewer originalUrl={previewUrl} gradcam={result.gradcam} />
                <SeverityCard
                  severityScore={result.severityScore}
                  tier={result.tier}
                  ood={result.ood}
                />
                <EnvironmentCard environment={result.environment} stress={result.stress} />
                <RecommendationCard recommendation={result.recommendation} />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
