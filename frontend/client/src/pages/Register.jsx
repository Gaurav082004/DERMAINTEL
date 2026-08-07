import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaArrowLeft,
  FaUser,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaShieldHeart,
} from "react-icons/fa6";

export default function Register() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    terms: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (form.password !== form.confirm) {
      alert("Passwords do not match.");
      return;
    }

    if (!form.terms) {
      alert("Please accept the Terms & Conditions.");
      return;
    }

    setLoading(true);

    // TODO: Replace with backend API

    setTimeout(() => {
      setLoading(false);
      navigate("/home");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-radial px-6 relative overflow-hidden">

      <div className="absolute w-96 h-96 bg-teal/10 rounded-full blur-[120px] -top-24 -left-24"></div>

      <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] bottom-0 right-0"></div>

      <Link
        to="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-muted hover:text-teal transition"
      >
        <FaArrowLeft />
        Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass rounded-3xl p-10 w-full max-w-md border border-teal/20 shadow-glass relative z-10"
      >

        <div className="text-center mb-8">

          <div className="w-20 h-20 rounded-full bg-teal-blue-gradient flex items-center justify-center text-3xl text-white mx-auto mb-5">
            <FaShieldHeart />
          </div>

          <h1 className="text-3xl font-bold mb-2">
            Create Account
          </h1>

          <p className="text-muted">
            Join DERMAINTEL and start your skin health journey.
          </p>

        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Full Name */}

          <div>

            <label className="text-sm text-muted block mb-2">
              Full Name
            </label>

            <div className="relative">

              <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-teal" />

              <input
                type="text"
                required
                placeholder="John Doe"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                className="w-full bg-surface border border-line rounded-xl py-3 pl-12 pr-4 outline-none focus:border-teal transition"
              />

            </div>

          </div>

          {/* Email */}

          <div>

            <label className="text-sm text-muted block mb-2">
              Email Address
            </label>

            <div className="relative">

              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-teal" />

              <input
                type="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
                className="w-full bg-surface border border-line rounded-xl py-3 pl-12 pr-4 outline-none focus:border-teal transition"
              />

            </div>

          </div>
                    {/* Password */}

          <div>

            <label className="text-sm text-muted block mb-2">
              Password
            </label>

            <div className="relative">

              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-teal" />

              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter password"
                value={form.password}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password: e.target.value,
                  })
                }
                className="w-full bg-surface border border-line rounded-xl py-3 pl-12 pr-12 outline-none focus:border-teal transition"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-teal"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>

            </div>

            <div className="mt-2 h-2 rounded-full bg-line overflow-hidden">

              <div
                className={`h-full transition-all duration-300 ${
                  form.password.length < 4
                    ? "w-1/4 bg-red-500"
                    : form.password.length < 8
                    ? "w-2/4 bg-yellow-500"
                    : form.password.length < 12
                    ? "w-3/4 bg-blue-500"
                    : "w-full bg-green-500"
                }`}
              />

            </div>

            <p className="text-xs text-muted mt-2">
              Use at least 8 characters including letters and numbers.
            </p>

          </div>

          {/* Confirm Password */}

          <div>

            <label className="text-sm text-muted block mb-2">
              Confirm Password
            </label>

            <div className="relative">

              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-teal" />

              <input
                type={showConfirm ? "text" : "password"}
                required
                placeholder="Confirm password"
                value={form.confirm}
                onChange={(e) =>
                  setForm({
                    ...form,
                    confirm: e.target.value,
                  })
                }
                className="w-full bg-surface border border-line rounded-xl py-3 pl-12 pr-12 outline-none focus:border-teal transition"
              />

              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-teal"
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>

            </div>

          </div>

          {/* Terms */}

          <label className="flex items-start gap-3 text-sm text-muted">

            <input
              type="checkbox"
              checked={form.terms}
              onChange={(e) =>
                setForm({
                  ...form,
                  terms: e.target.checked,
                })
              }
              className="accent-teal mt-1"
            />

            <span>
              I agree to the{" "}
              <span className="text-teal cursor-pointer hover:underline">
                Terms & Conditions
              </span>{" "}
              and{" "}
              <span className="text-teal cursor-pointer hover:underline">
                Privacy Policy
              </span>.
            </span>

          </label>

          {/* Register Button */}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-teal-blue-gradient text-ink font-semibold hover:shadow-glow transition disabled:opacity-60"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

        </form>

        <div className="text-center mt-8">

          <p className="text-muted">
            Already have an account?

            <Link
              to="/login"
              className="text-teal font-semibold ml-2 hover:underline"
            >
              Log In
            </Link>

          </p>

        </div>

      </motion.div>

    </div>
  );
}