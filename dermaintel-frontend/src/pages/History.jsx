import { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import HistoryList from '../components/HistoryList';
import { fetchHistory } from '../services/api';
import Reveal from '../components/Reveal';
import './History.css';

const History = forwardRef((props, ref) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await fetchHistory();
    setHistory(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useImperativeHandle(ref, () => ({ refresh: load }));

  return (
    <section id="history" className="history-section">
      <div className="container">
        <Reveal as="div" className="section-heading">
          <span className="eyebrow">Recent Analyses</span>
          <h2>History</h2>
          <p>Stored automatically when the database layer is available.</p>
        </Reveal>
        <HistoryList history={history} loading={loading} />
      </div>
    </section>
  );
});

export default History;
