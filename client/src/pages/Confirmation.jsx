import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaLocationDot,
  FaTemperatureHalf,
  FaDroplet,
  FaSun,
  FaWind,
  FaCircleCheck,
  FaClock,
} from "react-icons/fa6";
import { useImageContext } from "../context/ImageContext";

export default function Confirmation() {
  const navigate = useNavigate();

  const { selectedImage, environment } = useImageContext();

  return (
    <div className="min-h-screen bg-ink-radial text-offwhite px-6 py-10">

      <div className="max-w-6xl mx-auto">

        <Link
          to="/environment"
          className="inline-flex items-center gap-2 text-teal hover:underline mb-8"
        >
          <FaArrowLeft />
          Back
        </Link>

        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold"
        >
          Confirm Analysis
        </motion.h1>

        <p className="text-muted mt-2">
          Please verify your image and environmental information before starting AI analysis.
        </p>

        <div className="grid lg:grid-cols-2 gap-8 mt-10">

          {/* Uploaded Image */}

          <div className="glass rounded-3xl p-6">

            <h2 className="text-2xl font-semibold mb-6">
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

          {/* Environment */}

          <div className="glass rounded-3xl p-6">

            <h2 className="text-2xl font-semibold mb-6">
              Environment Summary
            </h2>

            <div className="space-y-5">

              <div className="flex items-center">
                <FaLocationDot className="text-teal mr-4" />
                <span>Location</span>
                <span className="ml-auto">{environment.location}</span>
              </div>

              <div className="flex items-center">
                <FaTemperatureHalf className="text-orange-400 mr-4" />
                <span>Temperature</span>
                <span className="ml-auto">{environment.temperature}</span>
              </div>

              <div className="flex items-center">
                <FaDroplet className="text-blue-400 mr-4" />
                <span>Humidity</span>
                <span className="ml-auto">{environment.humidity}</span>
              </div>

              <div className="flex items-center">
                <FaSun className="text-yellow-400 mr-4" />
                <span>UV Index</span>
                <span className="ml-auto">{environment.uvIndex}</span>
              </div>

              <div className="flex items-center">
                <FaWind className="text-cyan-400 mr-4" />
                <span>Air Quality</span>
                <span className="ml-auto">{environment.airQuality}</span>
              </div>

            </div>

            <div className="mt-8 p-5 rounded-xl bg-green-500/10 border border-green-500/30">

              <div className="flex items-center gap-3">

                <FaCircleCheck className="text-green-400 text-xl" />

                <h3 className="font-semibold text-green-400">
                  Ready for AI Analysis
                </h3>

              </div>

              <div className="flex items-center gap-3 mt-4">

                <FaClock className="text-yellow-400" />

                <p className="text-sm text-muted">
                  Estimated processing time: 5–10 seconds
                </p>

              </div>

            </div>

            <button
              onClick={() => navigate("/processing")}
              className="w-full mt-8 py-4 rounded-xl bg-teal-blue-gradient text-ink font-semibold flex items-center justify-center gap-3 hover:shadow-glow transition"
            >
              Start AI Analysis

              <FaArrowRight />

            </button>

          </div>

        </div>

      </div>

    </div>
  );
}