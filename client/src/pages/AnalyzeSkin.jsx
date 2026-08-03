import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useImageContext } from "../context/ImageContext.jsx";
import {
  FaArrowLeft,
  FaCloudUploadAlt,
  FaTrash,
  FaArrowRight,
  FaInfoCircle,
} from "react-icons/fa";

export default function AnalyzeSkin() {
  const navigate = useNavigate();

  const {
    selectedImage,
    setSelectedImage,
    selectedFile,
    setSelectedFile,
  } = useImageContext();

  const handleImage = (e) => {
    const file = e.target.files[0];

    if (file) {
      setSelectedFile(file);
      setSelectedImage(URL.createObjectURL(file));
    }
  };

  return (
    <div className="min-h-screen bg-ink-radial text-offwhite px-6 py-10">
      <div className="max-w-6xl mx-auto">

        {/* Back Button */}

        <Link
          to="/home"
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
          Analyze Skin
        </motion.h1>

        <p className="text-muted mt-2">
          Upload a clear image of the affected skin area for AI analysis.
        </p>

        <div className="grid lg:grid-cols-2 gap-10 mt-10">

          {/* Upload Section */}

          <div className="glass rounded-3xl p-8">

            {!selectedImage ? (

              <label className="border-2 border-dashed border-line rounded-3xl h-96 flex flex-col justify-center items-center cursor-pointer hover:border-teal transition">

                <FaCloudUploadAlt className="text-7xl text-teal mb-6" />

                <h2 className="text-2xl font-semibold">
                  Upload Image
                </h2>

                <p className="text-muted mt-2">
                  JPG, JPEG or PNG
                </p>

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImage}
                />

              </label>

            ) : (

              <div>

                <div className="w-full h-96 bg-surface rounded-3xl flex items-center justify-center">

                  <img
                    src={selectedImage}
                    alt="Uploaded Skin"
                    className="max-w-full max-h-full object-contain rounded-3xl"
                  />

                </div>

                {selectedFile && (

                  <p className="mt-4 text-center text-sm text-teal">

                    {selectedFile.name}

                  </p>

                )}

                <div className="flex gap-4 mt-6">

                  <label className="flex-1 bg-teal-blue-gradient rounded-xl py-3 text-center cursor-pointer font-semibold text-ink">

                    Change Image

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImage}
                    />

                  </label>

                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setSelectedFile(null);
                    }}
                    className="px-5 rounded-xl bg-red-500 hover:bg-red-600 transition"
                  >
                    <FaTrash />
                  </button>

                </div>

              </div>

            )}

          </div>

          {/* Guidelines */}

          <div className="glass rounded-3xl p-8">

            <div className="flex items-center gap-3 mb-6">

              <FaInfoCircle className="text-3xl text-teal" />

              <h2 className="text-2xl font-bold">
                Image Guidelines
              </h2>

            </div>

            <ul className="space-y-4 text-muted">

              <li>✅ Capture only the affected skin area.</li>

              <li>✅ Use good natural lighting.</li>

              <li>✅ Keep the camera steady.</li>

              <li>✅ Avoid blurry photographs.</li>

              <li>✅ Remove beauty filters.</li>

              <li>✅ Fill most of the image with the affected skin.</li>

            </ul>

            <button
              disabled={!selectedImage}
              onClick={() => navigate("/environment")}
              className={`w-full mt-10 py-4 rounded-xl font-semibold flex justify-center items-center gap-3 transition ${
                selectedImage
                  ? "bg-teal-blue-gradient text-ink hover:shadow-glow"
                  : "bg-surface cursor-not-allowed text-muted"
              }`}
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