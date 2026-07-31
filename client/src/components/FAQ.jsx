import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronDown } from "react-icons/fa6";
import { FAQS } from "../data/content.js";

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-3">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="glass rounded-xl overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-medium text-sm sm:text-base">{item.q}</span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="text-teal shrink-0"
              >
                <FaChevronDown />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="px-5"
                >
                  <p className="text-sm text-muted pb-4 leading-relaxed">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
