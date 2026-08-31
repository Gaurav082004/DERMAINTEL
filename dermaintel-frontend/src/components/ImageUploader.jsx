import { useRef, useState, useCallback } from 'react';
import './ImageUploader.css';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_BYTES = 5 * 1024 * 1024;

export default function ImageUploader({ image, previewUrl, onSelect, onRemove, error, setError }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const validateAndSet = useCallback(
    (file) => {
      if (!file) return;
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Please upload a JPG or PNG image.');
        return;
      }
      if (file.size > MAX_BYTES) {
        setError('Image must be 5 MB or smaller.');
        return;
      }
      setError(null);
      onSelect(file);
    },
    [onSelect, setError]
  );

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSet(file);
  }

  function handleChange(e) {
    const file = e.target.files?.[0];
    validateAndSet(file);
  }

  if (previewUrl) {
    return (
      <div className="uploader uploader--preview">
        <img src={previewUrl} alt="Uploaded skin sample preview" className="uploader__preview-img" />
        <div className="uploader__preview-meta">
          <span className="mono uploader__filename">{image?.name}</span>
          <div className="uploader__preview-actions">
            <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()}>
              Replace
            </button>
            <button type="button" className="btn btn-secondary" onClick={onRemove}>
              Remove
            </button>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleChange}
          hidden
        />
      </div>
    );
  }

  return (
    <div>
      <div
        className={`uploader ${dragActive ? 'uploader--active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 16V4M12 4L7 9M12 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="uploader__title">Drag and drop a skin image, or click to browse</p>
        <span className="tag">JPG · PNG · MAX 5MB</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleChange}
          hidden
        />
      </div>
      {error && <p className="uploader__error">{error}</p>}
    </div>
  );
}
