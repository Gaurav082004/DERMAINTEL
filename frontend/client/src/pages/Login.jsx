import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaArrowLeft,
  FaGoogle,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaShieldHeart,
} from "react-icons/fa6";

export default function Login() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    setLoading(true);

    // TODO: Replace with Express API
    setTimeout(() => {
      setLoading(false);
      navigate("/home");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-radial px-6 relative overflow-hidden">

      {/* Background Glow */}

      <div className="absolute w-96 h-96 bg-teal/10 rounded-full blur-[120px] -top-20 -left-20" />
      <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] bottom-0 right-0" />

      {/* Back */}

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
        className="glass rounded-3xl p-10 w-full max-w-md shadow-glass border border-teal/20 relative z-10"
      >
        {/* Logo */}

        <div className="text-center mb-8">

          <div className="w-20 h-20 rounded-full bg-teal-blue-gradient flex items-center justify-center text-3xl text-white mx-auto mb-5">
            <FaShieldHeart />
          </div>

          <h1 className="text-3xl font-bold mb-2">
            Welcome Back
          </h1>

          <p className="text-muted">
            Sign in to continue using DERMAINTEL
          </p>

        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}

          <div>

            <label className="text-sm text-muted mb-2 block">
              Email Address
            </label>

            <div className="relative">

              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-teal" />

              <input
                type="email"
                required
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
                placeholder="you@example.com"
                className="w-full bg-surface border border-line rounded-xl py-3 pl-12 pr-4 outline-none focus:border-teal transition"
              />

            </div>

          </div>

          {/* Password */}

          <div>

            <label className="text-sm text-muted mb-2 block">
              Password
            </label>

            <div className="relative">

              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-teal" />

              <input
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password: e.target.value,
                  })
                }
                placeholder="Enter your password"
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

          </div>

          {/* Remember */}

          <div className="flex justify-between items-center text-sm">

            <label className="flex items-center gap-2 text-muted">

              <input
                type="checkbox"
                checked={form.remember}
                onChange={(e) =>
                  setForm({
                    ...form,
                    remember: e.target.checked,
                  })
                }
                className="accent-teal"
              />

              Remember Me

            </label>

            <a
              href="#"
              className="text-teal hover:underline"
            >
              Forgot Password?
            </a>

          </div>

          {/* Login */}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-teal-blue-gradient text-ink font-semibold hover:shadow-glow transition"
          >
            {loading ? "Signing In..." : "Log In"}
          </button>

          {/* Divider */}

          <div className="flex items-center gap-3">

            <span className="flex-1 h-px bg-line"></span>

            <span className="text-xs text-muted">
              OR
            </span>

            <span className="flex-1 h-px bg-line"></span>

          </div>

          {/* Google */}

          <button
            type="button"
            className="w-full py-3 rounded-xl border border-line flex justify-center items-center gap-3 hover:border-teal transition"
          >
            <FaGoogle />

            Continue with Google
          </button>

        </form>

        <div className="text-center mt-8">

          <p className="text-muted">

            Don't have an account?

            <Link
              to="/register"
              className="text-teal font-semibold ml-2 hover:underline"
            >
              Register
            </Link>

          </p>

        </div>

      </motion.div>

    </div>
  );
}