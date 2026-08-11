import './HistoryList.css';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

const TIER_CLASS = { Low: 'tier--low', Medium: 'tier--medium', High: 'tier--high' };

export default function HistoryList({ history, loading }) {
  if (loading) {
    return <p className="history-empty">Loading recent analyses…</p>;
  }

  if (!history || history.length === 0) {
    return <p className="history-empty">No previous analyses available.</p>;
  }

  return (
    <div className="history-grid">
      {history.map((item, i) => (
        <div key={item._id || i} className="history-item card">
          {item.gradcam ? (
            <img src={item.gradcam} alt={`${item.condition} analysis thumbnail`} className="history-item__thumb" />
          ) : (
            <div className="history-item__thumb history-item__thumb--empty" />
          )}
          <div className="history-item__body">
            <div className="history-item__row">
              <span className="history-item__condition">{item.condition || 'Unknown'}</span>
              <span className={`severity-tier__badge history-item__tier ${TIER_CLASS[item.tier] || ''}`}>
                {item.tier || '—'}
              </span>
            </div>
            <div className="history-item__stats mono">
              <span>{item.confidence ? `${Math.round(item.confidence * 1000) / 10}%` : '—'}</span>
              <span>·</span>
              <span>{item.severityScore != null ? Number(item.severityScore).toFixed(2) : '—'} / 10</span>
            </div>
            <span className="history-item__date">{formatDate(item.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
