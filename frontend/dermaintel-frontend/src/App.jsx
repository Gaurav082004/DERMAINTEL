import { useRef } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Hero from './pages/Hero';
import Analysis from './pages/Analysis';
import History from './pages/History';
import Methodology from './pages/Methodology';

export default function App() {
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
