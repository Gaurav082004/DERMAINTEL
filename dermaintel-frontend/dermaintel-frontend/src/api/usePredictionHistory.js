import { useCallback, useEffect, useState } from 'react';
import { fetchPredictionHistory, ApiError } from './client';

/**
 * usePredictionHistory
 *
 * Loads GET /api/predictions once on mount and exposes a `reload`
 * function. Shared by History and Monitoring so both read the exact
 * same backend-sourced list instead of maintaining separate demo data.
 */
export function usePredictionHistory() {
  const [entries, setEntries] = useState([]);
  const [mongoConnected, setMongoConnected] = useState(true);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const controller = new AbortController();
    setStatus('loading');
    setError('');

    fetchPredictionHistory({ signal: controller.signal })
      .then(({ entries: fetched, mongoConnected: connected }) => {
        setEntries(fetched);
        setMongoConnected(connected);
        setStatus('ready');
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof ApiError ? err.message : 'Something went wrong while loading history.');
        setStatus('error');
      });

    return controller;
  }, []);

  useEffect(() => {
    const controller = load();
    return () => controller.abort();
  }, [load]);

  return { entries, mongoConnected, status, error, reload: load };
}
