import { FaGithub, FaLinkedin, FaEnvelope } from "react-icons/fa6";
import { NAV_LINKS } from "../data/content.js";

export default function Footer() {
  return (
    <footer id="footer" className="border-t border-line px-6 py-12 mt-10">
      <div className="max-w-7xl mx-auto grid sm:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg bg-teal-blue-gradient" />
            <span className="font-display font-semibold">DERMAINTEL</span>
          </div>
          <p className="text-sm text-muted max-w-xs">
            AI-assisted skin health analysis and environment-aware recommendations.
          </p>
        </div>

        <div>
          <p className="text-sm font-medium mb-3">Quick links</p>
          <ul className="flex flex-col gap-2 text-sm text-muted">
            {NAV_LINKS.map((l) => (
              <li key={l.label}>
                <a href={l.to} className="hover:text-offwhite transition-colors">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium mb-3">Connect</p>
          <div className="flex gap-4 text-lg text-muted">
            <a href="#" aria-label="GitHub" className="hover:text-teal transition-colors">
              <FaGithub />
            </a>
            <a href="#" aria-label="LinkedIn" className="hover:text-teal transition-colors">
              <FaLinkedin />
            </a>
            <a href="#" aria-label="Email" className="hover:text-teal transition-colors">
              <FaEnvelope />
            </a>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted text-center mt-10">
        © {new Date().getFullYear()} DERMAINTEL. Final-year capstone project.
      </p>
    </footer>
  );
}
