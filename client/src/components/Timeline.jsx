import { motion } from "framer-motion";
import { STEPS } from "../data/content.js";

export default function Timeline() {
  return (
    <div className="grid md:grid-cols-4 gap-6 md:gap-4 relative">
      <div className="hidden md:block absolute top-7 left-[12%] right-[12%] h-px bg-line" />
      {STEPS.map((s, i) => (
        <motion.div
          key={s.step}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, delay: i * 0.15 }}
          className="relative flex md:flex-col items-start md:items-center gap-4 md:gap-3 md:text-center"
        >
          <span className="relative z-10 w-14 h-14 shrink-0 rounded-full bg-surface border border-teal/40 flex items-center justify-center font-mono text-teal">
            {String(s.step).padStart(2, "0")}
          </span>
          <div>
            <h4 className="font-medium">{s.title}</h4>
            <p className="text-sm text-muted mt-1 max-w-[200px]">{s.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
