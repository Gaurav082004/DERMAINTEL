import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Container from '../../components/layout/Container';
import PageSection from '../../components/layout/PageSection';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { IconAlertTriangle, IconScan } from '../../components/ui/icons';
import { submitPrediction, ApiError } from '../../api/client';
import './Processing.css';

// Comfortably above Express's own FLASK_TIMEOUT_MS (30s default) so a
// real slow-but-successful inference isn't cut off client-side first.
const REQUEST_TIMEOUT_MS = 45000;

// Neutral, frontend-only progress messages. These are UI reassurance
// text, NOT real backend events — the frontend has no visibility into
// actual Flask/ML pipeline steps, so nothing here claims a specific
// step has completed on the server.
const ACTIVITY_STEPS = [
  { delay: 0, message: 'Console ready.' },
  { delay: 300, message: 'Image uploaded.' },
  { delay: 700, message: 'Validating analysis inputs...' },
  { delay: 1400, message: 'Sending image for analysis...' },
  { delay: 2600, message: 'Analysis in progress...' },
  { delay: 5000, message: 'Processing prediction...' },
  { delay: 8000, message: 'Processing environmental/context data...' },
  { delay: 12000, message: 'Generating explanation...' },
  { delay: 17000, message: 'Finalizing result...' },
  { delay: 23000, message: 'Waiting for analysis response...' },
];

function formatTimestamp(date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

/**
 * Processing
 *
 * The real "Processing" step between Scan & Analyze and Results. Reads
 * the uploaded File and environmental context handed off via router
 * state, submits them to Express's POST /api/predict, and on success
 * navigates to /results with the backend's normalized prediction.
 * Handles the loading state, request timeouts, validation errors, and
 * a backend/network failure — with a retry that re-sends the same
 * submission.
 *
 * While the request is in flight, a small activity console shows
 * progressive, neutral status messages purely for UX reassurance. The
 * actual success/failure state is still driven entirely by the real
 * submitPrediction() promise — the console never determines or fakes
 * completion.
 */
export default function Processing() {
  const location = useLocation();
  const navigate = useNavigate();
  const { file, environment } = location.state ?? {};

  const [status, setStatus] = useState('loading'); // 'loading' | 'error'
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [logEntries, setLogEntries] = useState([]);
  const navigatedRef = useRef(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (!file || !environment) return undefined;

    // Guards against a stale/superseded run of this effect setting state
    // after the fact. This matters because this effect can legitimately
    // run more than once for the "same" submission — most notably,
    // React 18 StrictMode intentionally mounts, cleans up, and
    // re-mounts effects once in development. The cleanup below calls
    // controller.abort() on the FIRST run's request, which makes that
    // first run's promise reject with an AbortError shortly after the
    // SECOND run has already started its own, real, still-pending
    // request. Without this guard, the first run's rejection handler
    // used to call setStatus('error'), so the UI flipped to
    // "Analysis Failed" almost immediately — even though the second
    // run's genuine request was still in flight and would go on to
    // succeed ~10s later. That is the exact bug: an aborted-by-cleanup
    // run was being treated as a real failure of the current request.
    let isCurrent = true;
    // Separately tracks whether THIS run's own timeout fired (a real
    // client-side timeout), as opposed to this run's controller being
    // aborted merely because the effect is cleaning up/re-running.
    let timedOut = false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    setStatus('loading');
    setError('');
    setLogEntries([]);

    const activityTimers = ACTIVITY_STEPS.map(({ delay, message }) =>
      setTimeout(() => {
        if (!isCurrent) return;
        setLogEntries((prev) => [...prev, { time: formatTimestamp(new Date()), message }]);
      }, delay)
    );

    submitPrediction(file, environment, { signal: controller.signal })
      .then((data) => {
        if (!isCurrent || navigatedRef.current) return;
        navigatedRef.current = true;
        setLogEntries((prev) => [...prev, { time: formatTimestamp(new Date()), message: 'Analysis complete.' }]);
        navigate('/results', { replace: true, state: { data, image: file } });
      })
      .catch((err) => {
        // This run was superseded (cleanup already ran, e.g. the
        // StrictMode double-invoke, or the user navigated/retried) —
        // its abort is not a real failure of the current request, so
        // don't touch the UI on its behalf.
        if (!isCurrent) return;

        if (timedOut) {
          setError('The analysis is taking longer than expected. The backend may be busy — please try again.');
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else if (err?.name === 'AbortError') {
          // Aborted for a reason other than our own timeout or a
          // superseded run (e.g. the browser tab losing focus); treat
          // as a genuine, user-facing failure rather than silently
          // guessing at "success".
          setError('The analysis was interrupted. Please try again.');
        } else {
          setError('Something went wrong while analyzing the image.');
        }
        setLogEntries((prev) => [...prev, { time: formatTimestamp(new Date()), message: 'Analysis failed.' }]);
        setStatus('error');
      })
      .finally(() => {
        clearTimeout(timeoutId);
        activityTimers.forEach(clearTimeout);
      });

    return () => {
      isCurrent = false;
      clearTimeout(timeoutId);
      activityTimers.forEach(clearTimeout);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, environment, attempt]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: 'end' });
  }, [logEntries]);

  if (!file || !environment) {
    return (
      <Container>
        <PageSection
          eyebrow="Analyzing"
          title="Processing"
          description="Running the CNN and environmental fusion pipeline on your submitted image."
        />
        <Card padding="lg" className="processing-card processing-card--error">
          <Badge tone="critical" dot>
            <IconAlertTriangle width={12} height={12} /> Nothing To Process
          </Badge>
          <h3 className="processing-card__heading">No submission found</h3>
          <p className="processing-card__body">
            This page expects an image and environmental context from Scan &amp; Analyze. Start a new analysis to
            continue.
          </p>
          <div className="processing-card__actions">
            <Button as={Link} to="/scan" variant="primary" iconLeft={<IconScan />}>
              Go to Scan &amp; Analyze
            </Button>
          </div>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <PageSection
        eyebrow="Analyzing"
        title="Processing"
        description="Running the CNN and environmental fusion pipeline on your submitted image."
      />

      {status === 'loading' ? (
        <Card padding="lg" className="processing-card">
          <span className="processing-spinner" aria-hidden="true" />
          <h3 className="processing-card__heading">Analyzing your submission…</h3>
          <p className="processing-card__body">
            Your image and environmental context have been sent to the Express backend, which forwards them to the
            Flask ML service for ResNet50 classification, feature extraction, MLP risk estimation, and Grad-CAM.
            This may take up to a minute — this page will stay open until a real response arrives.
          </p>

          <div className="activity-console">
            <div className="activity-console__header">
              <span className="activity-console__title">ACTIVITY</span>
              <button
                type="button"
                className="activity-console__clear"
                onClick={() => setLogEntries([])}
              >
                Clear
              </button>
            </div>
            <div className="activity-console__body">
              {logEntries.map((entry, idx) => (
                <div className="activity-console__line" key={idx}>
                  <span className="activity-console__time">{entry.time}</span>
                  <span className="activity-console__message">{entry.message}</span>
                </div>
              ))}
              <div className="activity-console__cursor-row">
                <span className="activity-console__cursor" aria-hidden="true" />
              </div>
              <div ref={logEndRef} />
            </div>
          </div>
        </Card>
      ) : (
        <Card padding="lg" className="processing-card processing-card--error">
          <Badge tone="critical" dot>
            <IconAlertTriangle width={12} height={12} /> Analysis Failed
          </Badge>
          <h3 className="processing-card__heading">We couldn't complete the analysis</h3>
          <p className="processing-card__body">{error}</p>
          <div className="processing-card__actions">
            <Button variant="primary" onClick={() => setAttempt((n) => n + 1)}>
              Try Again
            </Button>
            <Button as={Link} to="/scan" variant="secondary">
              Back to Scan &amp; Analyze
            </Button>
          </div>
        </Card>
      )}
    </Container>
  );
}
