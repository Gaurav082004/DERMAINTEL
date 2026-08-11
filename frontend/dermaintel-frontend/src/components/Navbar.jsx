import { useState, useEffect } from 'react';
import './Navbar.css';

const LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'analyze', label: 'Analyze' },
  { id: 'history', label: 'History' },
  { id: 'methodology', label: 'Methodology' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function goTo(id) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container navbar__inner">
        <button className="navbar__brand" onClick={() => goTo('home')}>
          <span className="navbar__mark" aria-hidden="true" />
          DERMAINTEL
        </button>

        <nav className="navbar__links navbar__links--desktop">
          {LINKS.map((link) => (
            <button key={link.id} onClick={() => goTo(link.id)}>
              {link.label}
            </button>
          ))}
        </nav>

        <button
          className="navbar__menu-toggle"
          aria-label="Toggle navigation menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {menuOpen && (
        <nav className="navbar__links navbar__links--mobile">
          {LINKS.map((link) => (
            <button key={link.id} onClick={() => goTo(link.id)}>
              {link.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
