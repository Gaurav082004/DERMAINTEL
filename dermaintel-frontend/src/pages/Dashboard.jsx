// Dashboard.jsx
//
// This is the existing, working application — unchanged in logic. It is
// the exact same composition that used to live in App.jsx: Navbar, Hero,
// Analysis (prediction pipeline), History, Methodology, Footer. Only the
// wrapping route changed (it now lives at /app); no state, API calls,
// form handling, or Grad-CAM/history logic was touched.

import { useRef } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Hero from './Hero';
import Analysis from './Analysis';
import History from './History';
import Methodology from './Methodology';

export default function Dashboard() {
  const historyRef = useRef(null);

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Analysis onNewResult={() => historyRef.current?.refresh()} />
        <History ref={historyRef} />
        <Methodology />
      </main>
      <Footer />
    </>
  );
}
