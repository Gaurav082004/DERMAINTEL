import { motion } from "framer-motion";
import {
  FaQuoteLeft,
  FaStar,
  FaUserDoctor,
  FaUserGraduate,
  FaLaptopCode,
} from "react-icons/fa6";

export default function Testimonial({
  name,
  role,
  quote,
  index = 0,
}) {
  const icons = [
    <FaUserDoctor />,
    <FaUserGraduate />,
    <FaLaptopCode />,
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.5,
        delay: index * 0.15,
      }}
      whileHover={{
        y: -8,
        scale: 1.02,
      }}
      className="glass rounded-3xl border border-teal/20 p-8 flex flex-col h-full hover:border-teal transition-all duration-300"
    >
      {/* Top */}

      <div className="flex justify-between items-center mb-6">

        <div className="w-16 h-16 rounded-full bg-teal-blue-gradient flex items-center justify-center text-2xl text-white shadow-glow">
          {icons[index] || <FaUserDoctor />}
        </div>

        <FaQuoteLeft className="text-4xl text-teal/30" />

      </div>

      {/* Rating */}

      <div className="flex gap-1 mb-5 text-yellow-400">
        <FaStar />
        <FaStar />
        <FaStar />
        <FaStar />
        <FaStar />
      </div>

      {/* Review */}

      <p className="text-muted leading-8 italic mb-8 flex-grow">
        "{quote}"
      </p>

      {/* User */}

      <div className="border-t border-line pt-5">

        <h3 className="text-lg font-semibold">
          {name}
        </h3>

        <p className="text-teal text-sm mt-1">
          {role}
        </p>

      </div>

    </motion.div>
  );
}