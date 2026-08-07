import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCircleCheck,
  FaTriangleExclamation,
  FaDownload,
  FaClockRotateLeft,
  FaArrowRight,
} from "react-icons/fa6";
import { useImageContext } from "../context/ImageContext";

export default function PredictionResult() {
  const navigate = useNavigate();

  const { selectedImage } = useImageContext();

  const result = {
    disease: "Acne Vulgaris",
    confidence: 96,
    severity: "Moderate",
  };

  const probabilities = [
    { label: "Acne", value: 96 },
    { label: "Psoriasis", value: 2 },
    { label: "Eczema", value: 1 },
    { label: "Healthy", value: 1 },
  ];

  return (
    <div className="min-h-screen bg-ink-radial text-offwhite px-6 py-10">

      <div className="max-w-7xl mx-auto">

        <button
          onClick={() => navigate("/processing")}
          className="inline-flex items-center gap-2 text-teal hover:underline mb-8"
        >
          <FaArrowLeft />
          Back
        </button>

        <motion.h1
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold"
        >
          Prediction Result
        </motion.h1>

        <p className="text-muted mt-2">
          AI prediction completed successfully.
        </p>

        <div className="grid lg:grid-cols-2 gap-8 mt-10">

          {/* Result */}

          <div className="glass rounded-3xl p-8">

            <div className="flex items-center gap-3 mb-8">

              <FaCircleCheck className="text-green-400 text-2xl" />

              <h2 className="text-2xl font-bold">
                Diagnosis
              </h2>

            </div>

            <div className="space-y-8">

              <div>

                <p className="text-muted">
                  Disease Detected
                </p>

                <h2 className="text-4xl font-bold text-teal mt-2">
                  {result.disease}
                </h2>

              </div>

              <div>

                <p className="text-muted">
                  Confidence Score
                </p>

                <h2 className="text-5xl font-bold mt-2">
                  {result.confidence}%
                </h2>

              </div>

              <div>

                <p className="text-muted mb-2">
                  Severity
                </p>

                <span className="px-5 py-2 rounded-full bg-yellow-500/20 text-yellow-400 font-semibold">

                  <FaTriangleExclamation className="inline mr-2" />

                  {result.severity}

                </span>

              </div>

            </div>

          </div>

          {/* Uploaded Image */}

          <div className="glass rounded-3xl p-8">

            <h2 className="text-2xl font-bold mb-6">
              Uploaded Image
            </h2>

            <div className="bg-surface rounded-3xl h-96 flex items-center justify-center overflow-hidden">

              {selectedImage ? (

                <img
                  src={selectedImage}
                  alt="Uploaded"
                  className="max-h-full max-w-full object-contain rounded-3xl"
                />

              ) : (

                <p className="text-muted">
                  No Image Available
                </p>

              )}

            </div>

          </div>

        </div>
                {/* Probability + Grad-CAM */}

        <div className="grid lg:grid-cols-2 gap-8 mt-8">

          {/* Probability Chart */}

          <div className="glass rounded-3xl p-8">

            <h2 className="text-2xl font-bold mb-8">
              Prediction Probability
            </h2>

            <div className="space-y-6">

              {probabilities.map((item) => (

                <div key={item.label}>

                  <div className="flex justify-between mb-2">

                    <span>{item.label}</span>

                    <span>{item.value}%</span>

                  </div>

                  <div className="w-full h-3 rounded-full bg-surface overflow-hidden">

                    <div
                      className="h-full bg-teal-blue-gradient rounded-full"
                      style={{
                        width: `${item.value}%`,
                      }}
                    />

                  </div>

                </div>

              ))}

            </div>

          </div>

          {/* Grad-CAM */}

          <div className="glass rounded-3xl p-8">

            <h2 className="text-2xl font-bold mb-6">
              Grad-CAM Visualization
            </h2>

            <div className="h-80 rounded-3xl border-2 border-dashed border-line flex items-center justify-center">

              <p className="text-muted text-center">
                Grad-CAM heatmap will appear here
                <br />
                after AI model integration.
              </p>

            </div>

          </div>

        </div>

        {/* Actions */}

        <div className="glass rounded-3xl p-8 mt-8">

          <h2 className="text-2xl font-bold mb-8">
            Next Actions
          </h2>

          <div className="grid md:grid-cols-3 gap-5">

            <button
              onClick={() => navigate("/recommendations")}
              className="py-4 rounded-xl bg-teal-blue-gradient text-ink font-semibold flex items-center justify-center gap-3 hover:shadow-glow transition"
            >
              <FaArrowRight />

              Recommendations

            </button>

            <button
              className="py-4 rounded-xl border border-line hover:border-teal transition flex items-center justify-center gap-3"
            >
              <FaDownload />

              Download Report

            </button>

            <button
              onClick={() => navigate("/history")}
              className="py-4 rounded-xl border border-line hover:border-teal transition flex items-center justify-center gap-3"
            >
              <FaClockRotateLeft />

              Save to History

            </button>

          </div>

        </div>

      </div>

    </div>
  );
}