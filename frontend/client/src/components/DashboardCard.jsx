import { motion } from "framer-motion";

export default function DashboardCard({ title, action, children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`glass rounded-2xl p-6 ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-medium">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </motion.div>
  );
}
