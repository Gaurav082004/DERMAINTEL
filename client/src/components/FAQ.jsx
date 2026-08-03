import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronDown, FaCircleQuestion } from "react-icons/fa6";
import { FAQS } from "../data/content.js";

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section className="max-w-5xl mx-auto">

      <div className="text-center mb-14">
        <p className="uppercase tracking-[4px] text-teal font-semibold mb-2">
          Support
        </p>

        <h2 className="text-4xl font-bold mb-4">
          Frequently Asked Questions
        </h2>

        <p className="text-muted max-w-2xl mx-auto leading-7">
          Find answers to the most common questions about DERMAINTEL,
          AI-powered skin disease prediction, image uploads, privacy,
          and personalized recommendations.
        </p>
      </div>

      <div className="space-y-5">
        {FAQS.map((item, index) => {
          const isOpen = open === index;

          return (
            <motion.div
              key={item.q}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: index * 0.08,
              }}
              className="glass rounded-2xl border border-teal/20 overflow-hidden hover:border-teal/40 transition-all"
            >
              <button
                onClick={() => setOpen(isOpen ? -1 : index)}
                className="w-full flex justify-between items-center p-6 text-left"
              >
                <div className="flex items-center gap-4">

                  <div className="w-12 h-12 rounded-xl bg-teal-blue-gradient flex items-center justify-center text-white">
                    <FaCircleQuestion />
                  </div>

                  <h3 className="font-semibold text-lg">
                    {item.q}
                  </h3>

                </div>

                <motion.div
                  animate={{
                    rotate: isOpen ? 180 : 0,
                  }}
                  transition={{
                    duration: 0.3,
                  }}
                  className="text-teal text-lg"
                >
                  <FaChevronDown />
                </motion.div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      height: 0,
                    }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                    }}
                    transition={{
                      duration: 0.3,
                    }}
                  >
                    <div className="px-20 pb-6">
                      <p className="text-muted leading-8">
                        {item.a}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

    </section>
  );
}