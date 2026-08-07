import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCalendar,
  FaClock,
  FaEye,
  FaTrash,
} from "react-icons/fa6";

const history = [
  {
    id: 1,
    disease: "Acne Vulgaris",
    confidence: "96%",
    severity: "Moderate",
    date: "04 Aug 2026",
    time: "10:30 AM",
  },
  {
    id: 2,
    disease: "Healthy Skin",
    confidence: "99%",
    severity: "Low",
    date: "02 Aug 2026",
    time: "08:20 PM",
  },
  {
    id: 3,
    disease: "Psoriasis",
    confidence: "91%",
    severity: "High",
    date: "28 Jul 2026",
    time: "06:15 PM",
  },
];

export default function History() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink-radial text-offwhite px-6 py-10">
      <div className="max-w-7xl mx-auto">

        {/* Back Button */}

        <button
          onClick={() => navigate("/recommendations")}
          className="inline-flex items-center gap-2 text-teal hover:underline mb-8"
        >
          <FaArrowLeft />
          Back
        </button>

        {/* Heading */}

        <motion.h1
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold"
        >
          Prediction History
        </motion.h1>

        <p className="text-muted mt-2">
          View all your previous AI skin analysis records.
        </p>

        {/* History Cards */}

        <div className="mt-10 space-y-6">

          {history.map((item) => (

            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-3xl p-6"
            >

              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">

                {/* Left Side */}

                <div>

                  <h2 className="text-2xl font-bold text-teal">
                    {item.disease}
                  </h2>

                  <div className="flex flex-wrap gap-6 mt-4 text-muted">

                    <div className="flex items-center gap-2">
                      <FaCalendar />
                      {item.date}
                    </div>

                    <div className="flex items-center gap-2">
                      <FaClock />
                      {item.time}
                    </div>

                  </div>

                </div>

                {/* Center */}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 flex-1">

                  <div className="bg-surface rounded-xl p-4 text-center">

                    <p className="text-sm text-muted">
                      Confidence
                    </p>

                    <h3 className="text-2xl font-bold text-teal mt-2">
                      {item.confidence}
                    </h3>

                  </div>

                  <div className="bg-surface rounded-xl p-4 text-center">

                    <p className="text-sm text-muted">
                      Severity
                    </p>

                    <span
                      className={`inline-block mt-2 px-4 py-1 rounded-full font-semibold ${
                        item.severity === "Low"
                          ? "bg-green-500/20 text-green-400"
                          : item.severity === "Moderate"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {item.severity}
                    </span>

                  </div>

                  <div className="bg-surface rounded-xl p-4 text-center">

                    <p className="text-sm text-muted">
                      Status
                    </p>

                    <h3 className="text-xl font-bold text-green-400 mt-2">
                      Completed
                    </h3>

                  </div>

                </div>

                {/* Right Side */}

                <div className="flex flex-wrap gap-4">

                  <button
                    onClick={() => navigate("/result")}
                    className="px-5 py-3 rounded-xl bg-teal-blue-gradient text-ink font-semibold flex items-center gap-2 hover:shadow-glow transition"
                  >
                    <FaEye />
                    View
                  </button>

                  <button
                    className="px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 transition"
                  >
                    <FaTrash />
                    Delete
                  </button>

                </div>

              </div>

            </motion.div>

          ))}

          {history.length === 0 && (

            <div className="glass rounded-3xl p-10 text-center">

              <h2 className="text-2xl font-bold">
                No Prediction History
              </h2>

              <p className="text-muted mt-3">
                Your future AI analysis records will appear here.
              </p>

            </div>

          )}

        </div>

      </div>
    </div>
  );
}