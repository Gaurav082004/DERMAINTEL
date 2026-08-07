import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  FaBell,
  FaUserCircle,
  FaCamera,
  FaHeart,
  FaChartLine,
  FaHistory,
  FaArrowRight,
} from "react-icons/fa";

const stats = [
  {
    title: "Total Scans",
    value: "18",
    icon: <FaCamera />,
  },
  {
    title: "Healthy",
    value: "12",
    icon: <FaHeart />,
  },
  {
    title: "Accuracy",
    value: "94%",
    icon: <FaChartLine />,
  },
  {
    title: "History",
    value: "18",
    icon: <FaHistory />,
  },
];

const recentScans = [
  {
    disease: "Healthy Skin",
    confidence: "99%",
    date: "Today",
    status: "Healthy",
  },
  {
    disease: "Acne",
    confidence: "94%",
    date: "Yesterday",
    status: "Moderate",
  },
  {
    disease: "Psoriasis",
    confidence: "87%",
    date: "Last Week",
    status: "Needs Care",
  },
];

export default function PersonalizedHome() {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

const notifications = [
  {
    id: 1,
    title: "Analysis Completed",
    message: "Your latest skin analysis is ready.",
  },
  {
    id: 2,
    title: "Health Tip",
    message: "Remember to apply SPF 30+ sunscreen today.",
  },
  {
    id: 3,
    title: "Reminder",
    message: "Upload a new skin image this week for tracking.",
  },
];

  return (
    <div className="min-h-screen bg-ink-radial text-offwhite">
  const [showMenu, setShowMenu] = useState(false);


      {/* Header */}

      <header className="relative z-50 border-b border-line backdrop-blur-lg">

        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">

          <div>

            <h1 className="text-3xl font-bold text-gradient">
              DERMAINTEL
            </h1>

            <p className="text-sm text-muted">
              AI Powered Skin Disease Detection
            </p>

          </div>

          <div className="flex items-center gap-6 relative">

            <div className="relative">

  <FaBell
    onClick={() => setShowNotifications(!showNotifications)}
    className="text-xl cursor-pointer hover:text-teal"
  />

  {notifications.length > 0 && (
    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
      {notifications.length}
    </span>
  )}

  {showNotifications && (

    <div className="absolute right-0 top-12 w-80 bg-surface border border-line rounded-xl shadow-2xl overflow-hidden z-[9999]">

      <div className="px-5 py-3 border-b border-line font-semibold">
        Notifications
      </div>

      {notifications.map((item) => (

        <div
          key={item.id}
          className="px-5 py-4 border-b border-line hover:bg-teal/10 transition"
        >
          <p className="font-medium">
            {item.title}
          </p>

          <p className="text-sm text-muted mt-1">
            {item.message}
          </p>
        </div>

      ))}

      <button
        onClick={() => setShowNotifications(false)}
        className="w-full py-3 text-teal hover:bg-teal/10 transition"
      >
        Close
      </button>

    </div>

  )}

</div>

            <div className="relative">

              <FaUserCircle
                onClick={() => setShowMenu(!showMenu)}
                className="text-4xl cursor-pointer hover:text-teal"
              />

              {showMenu && (

                <div className="absolute right-0 mt-4 w-52 rounded-xl bg-surface border border-line shadow-2xl overflow-hidden z-50">

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      navigate("/profile");
                    }}
                    className="w-full px-5 py-3 text-left hover:bg-teal/10 transition"
                  >
                    👤 My Profile
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      navigate("/history");
                    }}
                    className="w-full px-5 py-3 text-left hover:bg-teal/10 transition"
                  >
                    📜 Prediction History
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      navigate("/");
                    }}
                    className="w-full px-5 py-3 text-left text-red-400 hover:bg-red-500/10 transition"
                  >
                    🚪 Logout
                  </button>

                </div>

              )}

            </div>

          </div>

        </div>

      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >

          <h2 className="text-5xl font-bold">
            Welcome Back 👋
          </h2>

          <p className="text-muted mt-3 text-lg">
            Monitor your skin health with AI-powered insights.
          </p>

        </motion.div>

        {/* Statistics */}

        <div className="grid md:grid-cols-4 gap-6 mt-10">

          {stats.map((item, index) => (

            <motion.div
              key={index}
              whileHover={{ y: -5 }}
              className="glass rounded-3xl p-6"
            >

              <div className="text-4xl text-teal mb-5">

                {item.icon}

              </div>

              <h3 className="text-4xl font-bold">

                {item.value}

              </h3>

              <p className="text-muted mt-2">

                {item.title}

              </p>

            </motion.div>

          ))}

        </div>

        {/* Quick Action */}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-3xl p-10 mt-10"
        >

          <h2 className="text-3xl font-bold mb-4">

            Start New Analysis

          </h2>

          <p className="text-muted mb-8">

            Upload a skin image and let DERMAINTEL analyze it using AI.

          </p>

          <Link
            to="/analyze"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-teal-blue-gradient text-ink font-semibold hover:shadow-glow"
          >

            <FaCamera />

            Analyze Skin

            <FaArrowRight />

          </Link>

        </motion.div>
                {/* Recent Analysis */}

        <div className="grid lg:grid-cols-3 gap-8 mt-10">

          {/* Recent Scans */}

          <div className="lg:col-span-2 glass rounded-3xl p-8">

            <div className="flex items-center justify-between mb-6">

              <h2 className="text-2xl font-bold">
                Recent Analysis
              </h2>

              <Link
                to="/history"
                className="text-teal hover:underline"
              >
                View All
              </Link>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b border-line">

                    <th className="text-left py-4">
                      Disease
                    </th>

                    <th className="text-left py-4">
                      Confidence
                    </th>

                    <th className="text-left py-4">
                      Date
                    </th>

                    <th className="text-left py-4">
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {recentScans.map((scan, index) => (

                    <tr
                      key={index}
                      className="border-b border-line hover:bg-surface/20 transition"
                    >

                      <td className="py-5">
                        {scan.disease}
                      </td>

                      <td className="py-5 text-teal font-semibold">
                        {scan.confidence}
                      </td>

                      <td className="py-5">
                        {scan.date}
                      </td>

                      <td className="py-5">

                        <span className="px-3 py-1 rounded-full bg-teal/10 text-teal text-sm">

                          {scan.status}

                        </span>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

          {/* AI Health Tips */}

          <div className="glass rounded-3xl p-8">

            <h2 className="text-2xl font-bold mb-6">

              AI Health Tips

            </h2>

            <div className="space-y-5">

              <div className="rounded-xl bg-surface p-4">
                💧 Drink at least 2–3 litres of water every day.
              </div>

              <div className="rounded-xl bg-surface p-4">
                ☀️ Use SPF 30+ sunscreen before going outdoors.
              </div>

              <div className="rounded-xl bg-surface p-4">
                🧴 Moisturize your skin regularly.
              </div>

              <div className="rounded-xl bg-surface p-4">
                🥗 Eat fruits and green vegetables daily.
              </div>

              <div className="rounded-xl bg-surface p-4">
                😴 Sleep for 7–8 hours every night.
              </div>

              <div className="rounded-xl bg-surface p-4">
                🩺 Consult a dermatologist if symptoms continue.
              </div>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}