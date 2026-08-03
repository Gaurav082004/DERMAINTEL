import {
  FaGithub,
  FaLinkedin,
  FaEnvelope,
  FaHeart,
  FaLocationDot,
  FaPhone,
} from "react-icons/fa6";
import { NAV_LINKS } from "../data/content.js";

export default function Footer() {
  return (
    <footer
      id="footer"
      className="border-t border-line bg-surface/20 mt-24"
    >
      <div className="max-w-7xl mx-auto px-6 py-16">

        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-12">

          {/* Logo */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-teal-blue-gradient flex items-center justify-center text-white font-bold text-lg">
                D
              </div>

              <div>
                <h2 className="text-2xl font-bold">
                  DERMAINTEL
                </h2>

                <p className="text-sm text-muted">
                  AI Skin Disease Detection
                </p>
              </div>
            </div>

            <p className="text-muted leading-7 mb-6">
              DERMAINTEL is an AI-powered dermatology platform that
              assists users in detecting possible skin conditions,
              generating Grad-CAM visualizations, and providing
              personalized skincare recommendations.
            </p>

            <div className="flex gap-4 text-xl">

              <a
                href="#"
                className="w-11 h-11 rounded-xl glass flex items-center justify-center hover:bg-teal hover:text-white transition"
              >
                <FaGithub />
              </a>

              <a
                href="#"
                className="w-11 h-11 rounded-xl glass flex items-center justify-center hover:bg-teal hover:text-white transition"
              >
                <FaLinkedin />
              </a>

              <a
                href="#"
                className="w-11 h-11 rounded-xl glass flex items-center justify-center hover:bg-teal hover:text-white transition"
              >
                <FaEnvelope />
              </a>

            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-semibold mb-6">
              Quick Links
            </h3>

            <ul className="space-y-4">
              {NAV_LINKS.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.to}
                    className="text-muted hover:text-teal transition"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-xl font-semibold mb-6">
              Features
            </h3>

            <ul className="space-y-4 text-muted">

              <li>AI Skin Disease Detection</li>

              <li>Grad-CAM Visualization</li>

              <li>Environmental Analysis</li>

              <li>Medical Reports</li>

              <li>Prediction History</li>

              <li>Personalized Recommendations</li>

            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xl font-semibold mb-6">
              Contact
            </h3>

            <div className="space-y-5">

              <div className="flex gap-4">

                <FaEnvelope className="text-teal mt-1" />

                <div>
                  <p className="font-medium">
                    Email
                  </p>

                  <p className="text-muted">
                    dermaintel@gmail.com
                  </p>
                </div>

              </div>

              <div className="flex gap-4">

                <FaPhone className="text-teal mt-1" />

                <div>
                  <p className="font-medium">
                    Phone
                  </p>

                  <p className="text-muted">
                    +91 98765 43210
                  </p>
                </div>

              </div>

              <div className="flex gap-4">

                <FaLocationDot className="text-teal mt-1" />

                <div>
                  <p className="font-medium">
                    Location
                  </p>

                  <p className="text-muted">
                    Bengaluru, Karnataka, India
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* Bottom */}

        <div className="border-t border-line mt-14 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">

          <p className="text-muted text-sm">
            © {new Date().getFullYear()} DERMAINTEL. All Rights Reserved.
          </p>

          <p className="text-sm text-muted flex items-center gap-2">
            Made with
            <FaHeart className="text-red-500" />
            using React, Flask & AI
          </p>

        </div>

      </div>
    </footer>
  );
}