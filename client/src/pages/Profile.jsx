import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaEnvelope,
  FaPhone,
  FaCamera,
  FaChartLine,
  FaHeart,
  FaLock,
  FaRightFromBracket,
  FaCircleUser,
} from "react-icons/fa6";

export default function Profile() {
  const navigate = useNavigate();

  const user = {
    name: "bhuvan",
    email: "bhuvan@gmail.com",
    phone: "+91 9902408448",
    totalScans: 18,
    healthy: 12,
    accuracy: "95%",
  };

  return (
    <div className="min-h-screen bg-ink-radial text-offwhite px-6 py-10">

      <div className="max-w-6xl mx-auto">

        <button
          onClick={() => navigate("/home")}
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
          My Profile
        </motion.h1>

        <p className="text-muted mt-2">
          Manage your account and view your statistics.
        </p>

        <div className="grid lg:grid-cols-3 gap-8 mt-10">

          {/* Profile Card */}

          <div className="glass rounded-3xl p-8 text-center">

            <FaCircleUser className="text-8xl text-teal mx-auto" />

            <button className="mt-5 px-5 py-2 rounded-xl bg-teal-blue-gradient text-ink font-semibold flex items-center gap-2 mx-auto">
              <FaCamera />
              Change Photo
            </button>

            <h2 className="text-2xl font-bold mt-6">
              {user.name}
            </h2>

            <p className="text-muted mt-2">
              Computer Science Student
            </p>

          </div>

          {/* Details */}

          <div className="glass rounded-3xl p-8 lg:col-span-2">

            <h2 className="text-2xl font-bold mb-8">
              Personal Information
            </h2>

            <div className="space-y-6">

              <div className="flex items-center gap-4">
                <FaEnvelope className="text-teal" />
                <span>Email</span>
                <span className="ml-auto">{user.email}</span>
              </div>

              <div className="flex items-center gap-4">
                <FaPhone className="text-teal" />
                <span>Phone</span>
                <span className="ml-auto">{user.phone}</span>
              </div>

            </div>

          </div>

        </div>

        {/* Statistics */}

        <div className="grid md:grid-cols-3 gap-6 mt-10">

          <div className="glass rounded-3xl p-8 text-center">

            <FaCamera className="text-4xl text-teal mx-auto mb-4" />

            <h2 className="text-4xl font-bold">
              {user.totalScans}
            </h2>

            <p className="text-muted mt-2">
              Total Analyses
            </p>

          </div>

          <div className="glass rounded-3xl p-8 text-center">

            <FaHeart className="text-4xl text-green-400 mx-auto mb-4" />

            <h2 className="text-4xl font-bold">
              {user.healthy}
            </h2>

            <p className="text-muted mt-2">
              Healthy Results
            </p>

          </div>

          <div className="glass rounded-3xl p-8 text-center">

            <FaChartLine className="text-4xl text-orange-400 mx-auto mb-4" />

            <h2 className="text-4xl font-bold">
              {user.accuracy}
            </h2>

            <p className="text-muted mt-2">
              AI Accuracy
            </p>

          </div>

        </div>

        {/* Actions */}

        <div className="glass rounded-3xl p-8 mt-10">

          <h2 className="text-2xl font-bold mb-6">
            Account Settings
          </h2>

          <div className="grid md:grid-cols-2 gap-5">

            <button
              className="py-4 rounded-xl border border-line hover:border-teal transition flex items-center justify-center gap-3"
            >
              <FaLock />
              Change Password
            </button>

            <button
              onClick={() => navigate("/")}
              className="py-4 rounded-xl bg-red-500 hover:bg-red-600 transition flex items-center justify-center gap-3"
            >
              <FaRightFromBracket />
              Logout
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}