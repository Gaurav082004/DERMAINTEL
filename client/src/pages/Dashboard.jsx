import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FaCloudArrowUp,
  FaImage,
  FaCircleCheck,
  FaCloudSun,
  FaClockRotateLeft,
  FaChartLine,
} from "react-icons/fa6";
import DashboardCard from "../components/DashboardCard.jsx";
import ScanFrame from "../components/ScanFrame.jsx";

const HISTORY_PLACEHOLDER = [
  { id: 1, date: "Jul 24, 2026", label: "Benign Nevus", confidence: 92 },
  { id: 2, date: "Jul 18, 2026", label: "Eczema", confidence: 87 },
  { id: 3, date: "Jul 10, 2026", label: "Psoriasis", confidence: 81 },
];

export default function Dashboard() {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleFiles = useCallback((files) => {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(file));
      // TODO: replace with Express API call — POST /api/analyze (multipart/form-data)
      // Express will forward the image to the Python ML service and return
      // the prediction, confidence score, Grad-CAM overlay, and recommendations.
    }
  }, []);

  return (
    <div className="min-h-screen px-6 py-10 max-w-7xl mx-auto">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="font-mono text-xs tracking-widest text-teal uppercase mb-1">Dashboard</p>
        <h1 className="text-3xl font-semibold font-display">Welcome back 👋</h1>
        <p className="text-muted mt-1 text-sm">
          Upload a new image or review your recent analysis history below.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upload + preview */}
        <DashboardCard title="New Analysis" className="lg:col-span-2">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? "border-teal bg-teal/5" : "border-line"
            }`}
          >
            {preview ? (
              <ScanFrame className="max-w-md mx-auto">
                <img src={preview} alt="Uploaded preview" className="w-full h-64 object-cover" />
              </ScanFrame>
            ) : (
              <>
                <FaCloudArrowUp className="text-4xl text-teal mx-auto mb-4" />
                <p className="font-medium mb-1">Drag &amp; drop an image here</p>
                <p className="text-sm text-muted mb-4">PNG or JPG, clear close-up of the affected area</p>
              </>
            )}

            <label className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-lg bg-teal-blue-gradient text-ink text-sm font-medium cursor-pointer hover:shadow-glow transition-shadow">
              <FaImage /> {preview ? "Replace image" : "Choose file"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          </div>
        </DashboardCard>

        {/* Prediction result */}
        <DashboardCard title="Prediction Result" action={<FaCircleCheck className="text-teal" />}>
          <div className="text-center py-6">
            <p className="text-2xl font-semibold font-mono text-teal">—</p>
            <p className="text-sm text-muted mt-1">Awaiting analysis</p>
          </div>
        </DashboardCard>

        {/* Confidence score */}
        <DashboardCard title="Confidence Score" action={<FaChartLine className="text-teal" />}>
          <div className="w-full h-2 rounded-full bg-surface2 overflow-hidden mb-2">
            <div className="h-full w-0 bg-teal-blue-gradient rounded-full transition-all" />
          </div>
          <p className="text-xs text-muted">No prediction yet</p>
        </DashboardCard>

        {/* Grad-CAM */}
        <DashboardCard title="Grad-CAM Visualization">
          <div className="rounded-xl border border-dashed border-line h-40 flex items-center justify-center text-sm text-muted">
            Heatmap will appear here after analysis
          </div>
        </DashboardCard>

        {/* Environmental recommendation */}
        <DashboardCard
          title="Environmental Recommendation"
          action={<FaCloudSun className="text-teal" />}
        >
          <div className="rounded-xl border border-dashed border-line h-40 flex items-center justify-center text-sm text-muted text-center px-4">
            Weather, UV index, and air quality based guidance will appear here
          </div>
        </DashboardCard>
      </div>

      {/* Prediction history */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <FaClockRotateLeft className="text-teal" />
          <h2 className="font-medium">Prediction History</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {HISTORY_PLACEHOLDER.map((h) => (
            <DashboardCard key={h.id} className="!p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{h.label}</p>
                  <p className="text-xs text-muted mt-0.5">{h.date}</p>
                </div>
                <span className="font-mono text-teal text-sm">{h.confidence}%</span>
              </div>
            </DashboardCard>
          ))}
        </div>
      </div>
    </div>
  );
}
