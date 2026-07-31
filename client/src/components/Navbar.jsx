import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { NAV_LINKS } from "../data/content.js";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-glass" : "bg-transparent border-b border-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-teal-blue-gradient" />
          <span className="font-display font-semibold text-lg tracking-tight">DERMAINTEL</span>
        </Link>

        <ul className="hidden md:flex items-center gap-8 text-sm text-muted">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <a href={link.to} className="hover:text-offwhite transition-colors">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden sm:inline-block px-4 py-2 text-sm rounded-lg text-offwhite/90 hover:text-offwhite border border-line hover:border-teal/40 transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-sm rounded-lg bg-teal-blue-gradient text-ink font-medium hover:shadow-glow transition-shadow"
          >
            Register
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}
