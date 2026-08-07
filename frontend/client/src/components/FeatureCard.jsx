import { motion } from "framer-motion";
import * as Icons from "react-icons/fa6";

export default function FeatureCard({ icon, title, desc, index = 0 }) {
  const Icon = Icons[icon] || Icons.FaCircle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      className="glass rounded-2xl p-6 hover:border-teal/30 transition-colors"
    >
      <div className="w-11 h-11 rounded-xl bg-teal-blue-gradient/20 border border-teal/30 flex items-center justify-center mb-4">
        <Icon className="text-teal text-lg" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{desc}</p>
    </motion.div>
  );
}
