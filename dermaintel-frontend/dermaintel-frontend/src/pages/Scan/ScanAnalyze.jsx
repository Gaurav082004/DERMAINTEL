import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../../components/layout/Container';
import PageSection from '../../components/layout/PageSection';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Slider from '../../components/ui/Slider';
import {
  IconUpload,
  IconCheckCircle,
  IconTrash,
  IconRefreshCw,
  IconThermometer,
  IconDroplet,
  IconSun,
  IconWind,
  IconActivity,
} from '../../components/ui/icons';
import './ScanAnalyze.css';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ACCEPTED_LABEL = 'JPG, JPEG or PNG';

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * ScanAnalyze
 *
 * The "Scan & Analyze" workflow. Collects a real uploaded image plus
 * the environmental context, then hands both off (via router state) to
 * the Processing page, which submits them to the Express backend's
 * POST /api/predict — image upload only; the previous demo-sample
 * picker has been removed since those weren't real image files.
 */
export default function ScanAnalyze() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [temperature, setTemperature] = useState(24);
  const [humidity, setHumidity] = useState(50);
  const [uvIndex, setUvIndex] = useState(5);
  const [aqi, setAqi] = useState(50);
  const [stress, setStress] = useState(3);

  // Keep the object URL for the live preview in sync with the current
  // file, and revoke it whenever it's replaced or the page unmounts.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function acceptFile(candidate) {
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setUploadError(`Unsupported file type. Please upload a ${ACCEPTED_LABEL} image.`);
      return;
    }
    setUploadError('');
    setFile(candidate);
  }

  function handleInputChange(event) {
    acceptFile(event.target.files?.[0] ?? null);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    acceptFile(event.dataTransfer.files?.[0] ?? null);
  }

  function handleDropzoneKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  }

  function handleRemove() {
    setFile(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleReplaceClick() {
    fileInputRef.current?.click();
  }

  const canExecute = Boolean(file);

  function handleExecute() {
    if (!canExecute) return;
    navigate('/processing', {
      state: {
        file,
        environment: {
          temperature,
          humidity,
          uvIndex: Number(uvIndex.toFixed(1)),
          aqi,
          stress,
        },
      },
    });
  }

  return (
    <Container>
      <PageSection
        eyebrow="Capture"
        title="Scan & Analyze"
        description="Upload a skin image and set the environmental context DERMAINTEL should factor into its AI-assisted analysis."
      />

      <div className="scan-grid">
        {/* ---------- Skin Image ---------- */}
        <Card eyebrow="1. Skin Image" title="Upload a Skin Image" padding="lg" className="scan-card">
          <div
            className={['scan-dropzone', isDragging ? 'scan-dropzone--active' : ''].filter(Boolean).join(' ')}
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={handleDropzoneKeyDown}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <span className="scan-dropzone__icon">
              <IconUpload />
            </span>
            <p className="scan-dropzone__title">Drag and drop your skin image here</p>
            <p className="scan-dropzone__hint">or click to browse files on your device</p>
            <Badge tone="neutral" className="mono">
              {ACCEPTED_LABEL}
            </Badge>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              className="scan-dropzone__input"
              onChange={handleInputChange}
            />
          </div>

          {uploadError ? <p className="scan-upload-error">{uploadError}</p> : null}

          {file ? (
            <div className="scan-preview">
              <div className="scan-preview__header">
                <span className="scan-preview__title">Active image</span>
                <Badge tone="low" dot>
                  <IconCheckCircle width={12} height={12} /> Valid Image
                </Badge>
              </div>

              <div className="scan-preview__body">
                {previewUrl ? (
                  <img src={previewUrl} alt="Selected skin scan preview" className="scan-preview__image" />
                ) : null}

                <div className="scan-preview__meta">
                  <div className="scan-preview__name">{file.name}</div>
                  <div className="scan-preview__detail mono">{formatBytes(file.size)}</div>
                </div>
              </div>

              <div className="scan-preview__actions">
                <Button variant="secondary" size="sm" iconLeft={<IconRefreshCw />} onClick={handleReplaceClick}>
                  Replace Image
                </Button>
                <Button variant="danger" size="sm" iconLeft={<IconTrash />} onClick={handleRemove}>
                  Remove
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        {/* ---------- Environmental Context ---------- */}
        <Card
          eyebrow="2. Environmental Context"
          title="Environmental Context Parameters"
          padding="lg"
          className="scan-card"
        >
          <p className="scan-env-description">
            These ambient factors are combined with the image-based CNN features by the MLP risk network when
            estimating severity.
          </p>

          <Slider
            label="Ambient Temperature"
            icon={<IconThermometer />}
            value={temperature}
            displayValue={`${temperature}°C`}
            min={10}
            max={45}
            step={0.5}
            onChange={setTemperature}
            scaleLabels={[
              { label: '10°C (Cold)' },
              { label: '24°C (Normal)', tone: 'low' },
              { label: '45°C (Extreme Heat)', tone: 'elevated' },
            ]}
          />

          <Slider
            label="Relative Humidity"
            icon={<IconDroplet />}
            value={humidity}
            displayValue={`${humidity}% RH`}
            min={15}
            max={95}
            step={1}
            onChange={setHumidity}
            scaleLabels={[
              { label: '15% (Dry)', tone: 'elevated' },
              { label: '50% (Optimal)', tone: 'low' },
              { label: '95% (Humid)' },
            ]}
          />

          <Slider
            label="UV Index"
            icon={<IconSun />}
            value={uvIndex}
            displayValue={uvIndex.toFixed(1)}
            min={0}
            max={11}
            step={0.1}
            onChange={setUvIndex}
            scaleLabels={[
              { label: '0 (Low)', tone: 'low' },
              { label: '5 (Moderate)', tone: 'moderate' },
              { label: '11+ (Extreme)', tone: 'elevated' },
            ]}
          />

          <Slider
            label="AQI / PM2.5"
            icon={<IconWind />}
            value={aqi}
            displayValue={aqi}
            min={0}
            max={200}
            step={1}
            onChange={setAqi}
            scaleLabels={[
              { label: '0 (Good)', tone: 'low' },
              { label: '100 (Moderate)', tone: 'moderate' },
              { label: '200+ (Unhealthy)', tone: 'elevated' },
            ]}
          />

          <Slider
            label="Stress Level"
            icon={<IconActivity />}
            value={stress}
            displayValue={`${stress}/10`}
            min={1}
            max={10}
            step={1}
            onChange={setStress}
            scaleLabels={[
              { label: '1 (Low)', tone: 'low' },
              { label: '5 (Moderate)', tone: 'moderate' },
              { label: '10 (Severe)', tone: 'elevated' },
            ]}
          />
        </Card>
      </div>

      {/* ---------- Execute ---------- */}
      <Card padding="lg" className="scan-execute">
        <div className="scan-execute__copy">
          <h3 className="scan-execute__title">Run the DERMAINTEL Pipeline</h3>
          <p className="scan-execute__description">
            {canExecute
              ? 'Your image and environmental context are ready. Executing the pipeline will submit them to the DERMAINTEL backend for analysis.'
              : 'Upload a skin image above to continue.'}
          </p>
        </div>
        <Button variant="primary" size="lg" disabled={!canExecute} onClick={handleExecute}>
          Execute DERMAINTEL Pipeline
        </Button>
      </Card>
    </Container>
  );
}
