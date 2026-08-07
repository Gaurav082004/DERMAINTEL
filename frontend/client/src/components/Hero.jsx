import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ScanFrame from "./ScanFrame.jsx";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.15,
      ease: "easeOut",
    },
  }),
};

export default function Hero() {
  return (
    <section
      id="home"
      className="relative bg-gradient-to-b from-white via-slate-50 to-gray-100 pt-32 pb-24 px-6"
    >
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">

        {/* Left Content */}
        <div>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0}
            className="uppercase tracking-[5px] text-cyan-600 text-sm font-semibold"
          >
            AI Assisted Dermatology
          </motion.p>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="mt-5 text-5xl lg:text-6xl font-bold leading-tight text-slate-900"
          >
            DERMAINTEL
          </motion.h1>

          <motion.h2
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="mt-5 text-2xl font-semibold text-slate-700"
          >
            AI-Powered Skin Disease Detection Platform
          </motion.h2>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
            className="mt-7 text-lg leading-8 text-gray-600 max-w-xl"
          >
            Upload a clear photo of the affected skin area and receive an
            AI-powered prediction with confidence score, environmental
            recommendations, and clinical insights to support early detection.
            DERMAINTEL is designed to assist healthcare awareness and is not a
            replacement for professional medical diagnosis.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
            className="mt-10 flex gap-5"
          >
            <Link
              to="/register"
              className="px-7 py-3 rounded-xl bg-cyan-600 text-white font-semibold shadow-lg hover:bg-cyan-700 transition duration-300"
            >
              Get Started
            </Link>

            <Link
              to="/login"
              className="px-7 py-3 rounded-xl border border-gray-300 text-slate-700 font-semibold hover:bg-gray-100 transition duration-300"
            >
              Login
            </Link>
          </motion.div>

          {/* Statistics */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={5}
            className="grid grid-cols-3 gap-6 mt-16"
          >
            <div>
              <h3 className="text-3xl font-bold text-cyan-600">95%</h3>
              <p className="text-gray-500 mt-2 text-sm">
                Prediction Accuracy
              </p>
            </div>

            <div>
              <h3 className="text-3xl font-bold text-cyan-600">5+</h3>
              <p className="text-gray-500 mt-2 text-sm">
                Skin Diseases
              </p>
            </div>

            <div>
              <h3 className="text-3xl font-bold text-cyan-600">24/7</h3>
              <p className="text-gray-500 mt-2 text-sm">
                AI Availability
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right Image */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <ScanFrame>
            <img
              src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&q=80"
              alt="AI Dermatology"
              className="w-full h-[500px] object-cover rounded-2xl"
            />
          </ScanFrame>
        </motion.div>
      </div>
    </section>
  );
}