import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Container from '../../components/layout/Container';
import PageSection from '../../components/layout/PageSection';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import { IconSearch, IconDownload, IconScan, IconInbox, IconAlertTriangle } from '../../components/ui/icons';
import { usePredictionHistory } from '../../api/usePredictionHistory';
import { conditionTone, normalizeTier, formatTierLabel } from '../../data/analysisData';
import './History.css';

const RISK_FILTERS = ['All', 'Low', 'Moderate', 'Elevated'];

const SORTERS = {
  recent: (a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0),
  'highest-risk': (a, b) => Number(b.severityScore) - Number(a.severityScore),
  'lowest-risk': (a, b) => Number(a.severityScore) - Number(b.severityScore),
  'highest-confidence': (a, b) => Number(b.confidence) - Number(a.confidence),
};

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function entryId(entry, index) {
  return entry._id || entry.id || index;
}

function downloadCsv(entries) {
  const header = [
    'Date',
    'Condition',
    'Confidence',
    'Risk Score',
    'Risk Tier',
    'Temperature (C)',
    'Humidity (%)',
    'UV Index',
    'AQI',
    'Stress (1-10)',
  ];
  const rows = entries.map((entry) => [
    formatDateTime(entry.createdAt),
    entry.condition,
    entry.confidence,
    entry.severityScore,
    formatTierLabel(entry.tier),
    entry.environment?.temperature,
    entry.environment?.humidity,
    entry.environment?.uvIndex,
    entry.environment?.aqi,
    entry.stress,
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'dermaintel-history.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * History
 *
 * Prediction History backed by GET /api/predictions on the Express
 * backend — every row is a real recorded analysis (best-effort saved
 * by app.js after each successful /api/predict call), not demo data.
 * "View" reuses the same { data } router-state shape the Results page
 * consumes; the original uploaded image isn't persisted by the
 * backend, so Results falls back to a condition swatch for these.
 */
export default function History() {
  const { entries, mongoConnected, status, error, reload } = usePredictionHistory();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [sortKey, setSortKey] = useState('recent');

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();

    return entries
      .filter((entry) => {
        const matchesSearch = term === '' || String(entry.condition ?? '').toLowerCase().includes(term);
        const matchesRisk = riskFilter === 'All' || formatTierLabel(entry.tier) === riskFilter;
        return matchesSearch && matchesRisk;
      })
      .sort(SORTERS[sortKey]);
  }, [entries, search, riskFilter, sortKey]);

  return (
    <Container>
      <PageSection
        eyebrow="Archive"
        title="Prediction History"
        description="Every AI-assisted analysis recorded by the backend, with its predicted condition, risk tier, and environmental context."
        action={
          <div className="history-header-actions">
            <Button as={Link} to="/scan" variant="primary" iconLeft={<IconScan />}>
              New Analysis
            </Button>
          </div>
        }
      />

      {!mongoConnected ? (
        <Card padding="md" className="history-warning">
          <Badge tone="critical" dot>
            <IconAlertTriangle width={12} height={12} /> No Database Connected
          </Badge>
          <p className="history-warning__text">
            The Express backend is running without MongoDB persistence, so prediction history isn't being saved.
            Results from new analyses will still display on the Results page, but won't appear here.
          </p>
        </Card>
      ) : null}

      <Card padding="md" className="history-toolbar">
        <div className="history-toolbar__search">
          <Input
            icon={<IconSearch />}
            placeholder="Search by predicted condition…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search prediction history"
          />
        </div>

        <div className="history-toolbar__filters">
          <span className="history-toolbar__filter-label">Risk:</span>
          <div className="history-filter" role="group" aria-label="Filter by risk tier">
            {RISK_FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                className={['history-filter__btn', riskFilter === option ? 'is-active' : ''].filter(Boolean).join(' ')}
                onClick={() => setRiskFilter(option)}
                aria-pressed={riskFilter === option}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="field__control history-toolbar__sort">
          <select
            className="field__input"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value)}
            aria-label="Sort history"
          >
            <option value="recent">Most Recent</option>
            <option value="highest-risk">Highest Risk</option>
            <option value="lowest-risk">Lowest Risk</option>
            <option value="highest-confidence">Highest Confidence</option>
          </select>
        </div>

        <Button
          variant="secondary"
          iconLeft={<IconDownload />}
          onClick={() => downloadCsv(filteredEntries)}
          disabled={filteredEntries.length === 0}
        >
          Export CSV
        </Button>
      </Card>

      {status === 'loading' ? (
        <Card padding="lg">
          <p className="history-status-text">Loading prediction history…</p>
        </Card>
      ) : status === 'error' ? (
        <Card padding="lg">
          <EmptyState
            icon={<IconAlertTriangle />}
            title="Couldn't load history"
            description={error}
            action={
              <Button variant="primary" onClick={reload}>
                Try Again
              </Button>
            }
          />
        </Card>
      ) : filteredEntries.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<IconInbox />}
            title={entries.length === 0 ? 'No analyses recorded yet' : 'No matching analyses'}
            description={
              entries.length === 0
                ? 'Run an analysis from Scan & Analyze to see it appear here.'
                : 'Try a different search term or risk filter.'
            }
          />
        </Card>
      ) : (
        <Card padding="none" className="history-table-card">
          <div className="history-table-scroll">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Predicted Condition</th>
                  <th>Confidence</th>
                  <th>Risk Score / Tier</th>
                  <th>Environmental Context</th>
                  <th>Date &amp; Time</th>
                  <th aria-label="Inspect" />
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry, index) => {
                  const tierTone = normalizeTier(entry.tier, entry.severityScore);
                  return (
                    <tr key={entryId(entry, index)}>
                      <td>
                        <span
                          className={`history-thumb history-thumb--${conditionTone(entry.condition)}`}
                          aria-hidden="true"
                        />
                      </td>
                      <td>
                        <span className="history-condition">{entry.condition}</span>
                      </td>
                      <td className="mono">
                        {Number.isFinite(Number(entry.confidence)) ? `${Number(entry.confidence)}` : '—'}
                      </td>
                      <td>
                        <div className="history-risk">
                          <span className="mono history-risk__score">{entry.severityScore}/100</span>
                          <Badge tone={tierTone}>{formatTierLabel(entry.tier)}</Badge>
                        </div>
                      </td>
                      <td>
                        <div className="history-env mono">
                          {entry.environment?.temperature}°C · {entry.environment?.humidity}% RH · UV{' '}
                          {entry.environment?.uvIndex} · AQI {entry.environment?.aqi} · Stress {entry.stress}/10
                        </div>
                      </td>
                      <td className="mono history-date">{formatDateTime(entry.createdAt)}</td>
                      <td>
                        <Button as={Link} to="/results" state={{ data: entry }} variant="outline" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Container>
  );
}
