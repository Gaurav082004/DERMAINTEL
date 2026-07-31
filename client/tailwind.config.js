/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#060B14",
        surface: "#0D1526",
        surface2: "#131E33",
        teal: {
          DEFAULT: "#22D3C7",
          soft: "#22D3C74d",
        },
        bluemed: {
          DEFAULT: "#3B6FE0",
          soft: "#3B6FE04d",
        },
        offwhite: "#F5F8FC",
        muted: "#8A9AB0",
        line: "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "teal-blue-gradient": "linear-gradient(135deg, #22D3C7 0%, #3B6FE0 100%)",
        "ink-radial": "radial-gradient(circle at 20% 20%, rgba(34,211,199,0.12), transparent 45%), radial-gradient(circle at 80% 0%, rgba(59,111,224,0.14), transparent 40%)",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.35)",
        glow: "0 0 24px rgba(34,211,199,0.35)",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        scan: "scan 2.8s ease-in-out infinite",
        marquee: "marquee 32s linear infinite",
      },
    },
  },
  plugins: [],
};
