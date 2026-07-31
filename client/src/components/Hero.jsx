import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ScanFrame from "./ScanFrame.jsx";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: "easeOut" },
  }),
};

export default function Hero() {
  return (
    <section id="home" className="relative pt-36 pb-24 px-6 overflow-hidden bg-ink-radial">
      {/* ambient particles */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-teal/30"
            style={{
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              top: `${(i * 37) % 100}%`,
              left: `${(i * 53) % 100}%`,
              animation: `pulse ${3 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0}
            className="font-mono text-xs tracking-widest text-teal uppercase mb-4"
          >
            AI-assisted dermatology
          </motion.p>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.05]"
          >
            <span className="text-gradient">DERMAINTEL</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="mt-3 text-xl text-offwhite/90 font-display"
          >
            AI-Powered Skin Disease Detection Platform
          </motion.p>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
            className="mt-6 text-muted leading-relaxed max-w-lg"
          >
            Upload a photo of the affected skin area. The model analyzes it, returns a
            prediction with a confidence score, and pairs it with environmental
            recommendations — built to support earlier detection, not replace a diagnosis.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
            className="mt-8 flex flex-wrap gap-4"
          >
            <Link
              to="/register"
              className="px-6 py-3 rounded-xl bg-teal-blue-gradient text-ink font-medium hover:shadow-glow transition-shadow"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl border border-line hover:border-teal/40 transition-colors"
            >
              Login
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <ScanFrame>
            <img
              src="https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=900&q=70"
              alt="Dermatology scan illustration"
              className="w-full h-[420px] object-cover"
            />
          </ScanFrame>
        </motion.div>
      </div>
    </section>
  );
}
