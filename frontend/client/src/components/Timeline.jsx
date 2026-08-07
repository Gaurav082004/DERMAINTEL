import { motion } from "framer-motion";
import { STEPS } from "../data/content.js";
import {
  FaCamera,
  FaUpload,
  FaBrain,
  FaFileMedical,
} from "react-icons/fa6";

const icons = [
  <FaCamera />,
  <FaUpload />,
  <FaBrain />,
  <FaFileMedical />,
];

export default function Timeline() {
  return (
    <section className="relative py-20">
      <div className="max-w-7xl mx-auto px-6">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-teal uppercase tracking-[4px] font-semibold mb-2">
            AI Workflow
          </p>

          <h2 className="text-4xl md:text-5xl font-bold">
            How DERMAINTEL Works
          </h2>

          <p className="text-muted max-w-3xl mx-auto mt-5 leading-8">
            DERMAINTEL uses Artificial Intelligence, medical image analysis,
            and environmental information to provide personalized skin disease
            predictions and recommendations in just a few simple steps.
          </p>
        </motion.div>

        <div className="relative">

          {/* Line */}
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-1 bg-line rounded-full"></div>

          <div className="grid lg:grid-cols-4 gap-10">

            {STEPS.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.15,
                }}
                whileHover={{
                  y: -10,
                }}
                className="relative z-10"
              >

                <div className="glass rounded-3xl p-8 text-center border border-teal/20 hover:border-teal transition-all duration-300 h-full">

                  <div className="w-20 h-20 rounded-full bg-teal-blue-gradient flex items-center justify-center text-white text-3xl mx-auto shadow-glow mb-6">
                    {icons[index]}
                  </div>

                  <div className="text-teal font-bold text-lg mb-2">
                    Step {step.step}
                  </div>

                  <h3 className="text-xl font-semibold mb-4">
                    {step.title}
                  </h3>

                  <p className="text-muted leading-7">
                    {step.desc}
                  </p>

                </div>

              </motion.div>
            ))}

          </div>
        </div>
      </div>
    </section>
  );
}