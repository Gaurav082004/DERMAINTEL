import { motion } from "framer-motion";
import { FaQuoteLeft } from "react-icons/fa6";

export default function Testimonial({ name, role, quote, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="glass rounded-2xl p-6 flex flex-col gap-4"
    >
      <FaQuoteLeft className="text-teal/50 text-xl" />
      <p className="text-sm text-offwhite/90 leading-relaxed">{quote}</p>
      <div className="mt-auto pt-2 border-t border-line">
        <p className="font-medium text-sm">{name}</p>
        <p className="text-xs text-muted">{role}</p>
      </div>
    </motion.div>
  );
}
