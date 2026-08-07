import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaHeart,
  FaLeaf,
  FaUtensils,
  FaShieldHeart,
} from "react-icons/fa6";
import { useImageContext } from "../context/ImageContext";

export default function Recommendations() {
  const navigate = useNavigate();

  const { prediction, environment } = useImageContext();

  const result = prediction || {
    disease: "Acne Vulgaris",
    confidence: 96,
    severity: "Moderate",
  };

  const skincare = [
    "Wash the affected area twice daily using a gentle cleanser.",
    "Apply an oil-free moisturizer regularly.",
    "Use dermatologist-approved acne medication if recommended.",
    "Avoid touching or squeezing pimples.",
    "Use sunscreen (SPF 30+) before going outdoors.",
  ];

  const diet = [
    "Drink 2–3 litres of water every day.",
    "Eat fresh fruits and green vegetables.",
    "Include foods rich in Vitamin A and Zinc.",
    "Reduce sugary foods and soft drinks.",
    "Avoid excessive oily and fried foods.",
  ];

  return (
    <div className="min-h-screen bg-ink-radial text-offwhite px-6 py-10">

      <div className="max-w-7xl mx-auto">

        <button
          onClick={() => navigate("/result")}
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
          Personalized Recommendations
        </motion.h1>

        <p className="text-muted mt-2">
          Recommendations generated based on the detected skin condition and environmental factors.
        </p>

        <div className="grid lg:grid-cols-2 gap-8 mt-10">

          {/* Disease Summary */}

          <div className="glass rounded-3xl p-8">

            <div className="flex items-center gap-3 mb-6">

              <FaHeart className="text-red-400 text-2xl" />

              <h2 className="text-2xl font-bold">
                Diagnosis Summary
              </h2>

            </div>

            <div className="space-y-6">

              <div>

                <p className="text-muted">
                  Disease
                </p>

                <h3 className="text-3xl font-bold text-teal mt-2">
                  {result.disease}
                </h3>

              </div>

              <div>

                <p className="text-muted">
                  Confidence
                </p>

                <h3 className="text-3xl font-bold mt-2">
                  {result.confidence}%
                </h3>

              </div>

              <div>

                <p className="text-muted">
                  Severity
                </p>

                <span className="inline-block mt-3 px-5 py-2 rounded-full bg-yellow-500/20 text-yellow-400 font-semibold">
                  {result.severity}
                </span>

              </div>

            </div>

          </div>

          {/* Skin Care */}

          <div className="glass rounded-3xl p-8">

            <div className="flex items-center gap-3 mb-6">

              <FaLeaf className="text-green-400 text-2xl" />

              <h2 className="text-2xl font-bold">
                Skin Care Tips
              </h2>

            </div>

            <ul className="space-y-4">

              {skincare.map((tip, index) => (

                <li
                  key={index}
                  className="flex gap-3 text-muted"
                >
                  ✅ {tip}
                </li>

              ))}

            </ul>

          </div>

        </div>

        {/* Diet */}

        <div className="glass rounded-3xl p-8 mt-8">

          <div className="flex items-center gap-3 mb-6">

            <FaUtensils className="text-orange-400 text-2xl" />

            <h2 className="text-2xl font-bold">
              Diet Recommendations
            </h2>

          </div>

          <div className="grid md:grid-cols-2 gap-6">

            {diet.map((item, index) => (

              <div
                key={index}
                className="bg-surface rounded-xl p-4"
              >
                ✅ {item}
              </div>

            ))}

          </div>

        </div>
                {/* Environment Recommendations */}

        <div className="glass rounded-3xl p-8 mt-8">

          <div className="flex items-center gap-3 mb-6">

            <FaShieldHeart className="text-cyan-400 text-2xl" />

            <h2 className="text-2xl font-bold">
              Environmental Recommendations
            </h2>

          </div>

          <div className="grid md:grid-cols-2 gap-6">

            <div className="bg-surface rounded-xl p-5">
              <h3 className="font-semibold text-teal mb-2">
                Current Environment
              </h3>

              <p><strong>📍 Location:</strong> {environment.location}</p>
              <p><strong>🌡 Temperature:</strong> {environment.temperature}</p>
              <p><strong>💧 Humidity:</strong> {environment.humidity}</p>
              <p><strong>☀ UV Index:</strong> {environment.uvIndex}</p>
              <p><strong>🌬 Air Quality:</strong> {environment.airQuality}</p>
            </div>

            <div className="bg-surface rounded-xl p-5">
              <h3 className="font-semibold text-teal mb-2">
                Precautions
              </h3>

              <ul className="space-y-3 text-muted">
                <li>✅ Apply SPF 30+ sunscreen before going outside.</li>
                <li>✅ Keep your skin moisturized.</li>
                <li>✅ Stay hydrated throughout the day.</li>
                <li>✅ Avoid excessive sun exposure.</li>
                <li>✅ Wash your face after sweating.</li>
              </ul>
            </div>

          </div>

        </div>

        {/* Lifestyle Tips */}

        <div className="glass rounded-3xl p-8 mt-8">

          <h2 className="text-2xl font-bold mb-6">
            Healthy Lifestyle Tips
          </h2>

          <div className="grid md:grid-cols-2 gap-5">

            <div className="bg-surface rounded-xl p-5">
              😴 Sleep at least 7–8 hours every night.
            </div>

            <div className="bg-surface rounded-xl p-5">
              🚶 Exercise regularly to improve blood circulation.
            </div>

            <div className="bg-surface rounded-xl p-5">
              💧 Drink plenty of water every day.
            </div>

            <div className="bg-surface rounded-xl p-5">
              🧘 Reduce stress through meditation or yoga.
            </div>

          </div>

        </div>

        {/* Action Buttons */}

        <div className="glass rounded-3xl p-8 mt-8">

          <h2 className="text-2xl font-bold mb-6">
            Actions
          </h2>

          <div className="grid md:grid-cols-3 gap-5">

            <button
              className="py-4 rounded-xl bg-teal-blue-gradient text-ink font-semibold hover:shadow-glow transition"
            >
              📥 Download Report
            </button>

            <button
              onClick={() => navigate("/history")}
              className="py-4 rounded-xl border border-line hover:border-teal transition"
            >
              📜 View History
            </button>

            <button
              onClick={() => navigate("/home")}
              className="py-4 rounded-xl border border-line hover:border-teal transition"
            >
              🏠 Go Home
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}