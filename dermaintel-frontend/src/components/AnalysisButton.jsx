import './AnalysisButton.css';

export default function AnalysisButton({ disabled, loading, onClick }) {
  return (
    <button className="btn btn-primary analyze-btn" disabled={disabled || loading} onClick={onClick}>
      {loading ? (
        <>
          <span className="spinner" aria-hidden="true" />
          Analyzing — this can take a few seconds…
        </>
      ) : (
        'Analyze Image'
      )}
    </button>
  );
}
