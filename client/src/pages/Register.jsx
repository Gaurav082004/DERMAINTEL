import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaArrowLeft } from "react-icons/fa6";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: replace with Express API call — POST /api/auth/register
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-ink-radial relative">
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted hover:text-offwhite transition-colors"
      >
        <FaArrowLeft /> Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass rounded-2xl p-8 w-full max-w-md shadow-glass"
      >
        <div className="mb-8 text-center">
          <span className="inline-block w-10 h-10 rounded-xl bg-teal-blue-gradient mb-4" />
          <h1 className="text-2xl font-semibold font-display">Create your account</h1>
          <p className="text-sm text-muted mt-1">Start tracking your skin health analysis.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-muted block mb-1.5">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your full name"
              className="w-full bg-surface border border-line rounded-lg px-4 py-2.5 text-sm outline-none focus:border-teal/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1.5">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              className="w-full bg-surface border border-line rounded-lg px-4 py-2.5 text-sm outline-none focus:border-teal/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1.5">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full bg-surface border border-line rounded-lg px-4 py-2.5 text-sm outline-none focus:border-teal/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1.5">Confirm password</label>
            <input
              type="password"
              required
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              placeholder="••••••••"
              className="w-full bg-surface border border-line rounded-lg px-4 py-2.5 text-sm outline-none focus:border-teal/50 transition-colors"
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full py-2.5 rounded-lg bg-teal-blue-gradient text-ink font-medium hover:shadow-glow transition-shadow"
          >
            Register
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-teal hover:underline">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
