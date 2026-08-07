import { useEffect } from "react";
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
} from "react-icons/fa6";
import { useImageContext } from "../context/ImageContext";

export default function EnvironmentalInfo() {
  const navigate = useNavigate();

  const {
    selectedImage,
    environment,
    setEnvironment,
  } = useImageContext();

  const dummyEnvironment = {
    location: "Bengaluru",
    temperature: "29°C",
    humidity: "68%",
    uvIndex: "Moderate",
    airQuality: "Good",
  };

  useEffect(() => {
    setEnvironment(dummyEnvironment);
  }, [setEnvironment]);

  return (
    <div className="min-h-screen bg-ink-radial text-offwhite px-6 py-10">
      <div className="max-w-6xl mx-auto">

        {/* Back Button */}

        <Link
          to="/analyze"
          className="inline-flex items-center gap-2 text-teal hover:underline mb-8"
        >
          <FaArrowLeft />
          Back
        </Link>

        {/* Heading */}

        <motion.h1
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold"
        >
          Environmental Information
        </motion.h1>

        <p className="text-muted mt-2">
          Weather and environmental conditions around your location.
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
                  alt="Uploaded Skin"
                  className="max-h-full max-w-full object-contain rounded-3xl"
                />
              ) : (
                <p className="text-muted">
                  No image uploaded
                </p>
              )}

            </div>

          </div>

          {/* Environment */}

          <div className="glass rounded-3xl p-6">

            <h2 className="text-2xl font-semibold mb-8">
              Environment Information
            </h2>

            <div className="space-y-6">

              <div className="flex items-center">
                <FaLocationDot className="text-teal text-xl mr-4" />
                <span>Location</span>
                <span className="ml-auto font-semibold">
                  {environment.location}
                </span>
              </div>

              <div className="flex items-center">
                <FaTemperatureHalf className="text-orange-400 text-xl mr-4" />
                <span>Temperature</span>
                <span className="ml-auto font-semibold">
                  {environment.temperature}
                </span>
              </div>

              <div className="flex items-center">
                <FaDroplet className="text-blue-400 text-xl mr-4" />
                <span>Humidity</span>
                <span className="ml-auto font-semibold">
                  {environment.humidity}
                </span>
              </div>

              <div className="flex items-center">
                <FaSun className="text-yellow-400 text-xl mr-4" />
                <span>UV Index</span>
                <span className="ml-auto font-semibold">
                  {environment.uvIndex}
                </span>
              </div>

              <div className="flex items-center">
                <FaWind className="text-cyan-400 text-xl mr-4" />
                <span>Air Quality</span>
                <span className="ml-auto font-semibold">
                  {environment.airQuality}
                </span>
              </div>

            </div>

            {/* Status */}

            <div className="mt-8 p-4 rounded-xl bg-green-500/10 border border-green-500/30">

              <p className="text-green-400 font-semibold">
                ✅ Environmental data collected successfully
              </p>

              <p className="text-sm text-muted mt-2">
                Your uploaded image and environmental information are ready for AI analysis.
              </p>

            </div>

            <button
              onClick={() => navigate("/confirmation")}
              className="w-full mt-8 py-4 rounded-xl bg-teal-blue-gradient text-ink font-semibold flex items-center justify-center gap-3 hover:shadow-glow transition"
            >
              Continue
              <FaArrowRight />
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}