import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { NAV_LINKS } from "../data/content.js";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white shadow-md"
          : "bg-white/90 backdrop-blur-md"
      }`}
    >
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-8 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600"></div>

          <span className="text-2xl font-bold text-slate-800">
            DERMAINTEL
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-10 text-gray-700 font-medium">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.to}
                className="hover:text-cyan-600 transition"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex gap-3">
          <Link
            to="/login"
            className="px-5 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
          >
            Log in
          </Link>

          <Link
            to="/register"
            className="px-5 py-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 transition"
          >
            Register
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}