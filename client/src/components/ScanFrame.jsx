import { motion } from "framer-motion";

/**
 * ScanFrame — the signature visual motif of DERMAINTEL.
 * A viewfinder-style bracket frame with an animated scan-line,
 * used to wrap the hero illustration, feature imagery, and the
 * dashboard upload/preview area. Ties the UI directly to the
 * product's core action: an AI "scanning" a skin image.
 */
export default function ScanFrame({ children, className = "", active = true }) {
  return (
    <div className={`relative ${className}`}>
      {/* corner brackets */}
      <span className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-teal rounded-tl-md" />
      <span className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-teal rounded-tr-md" />
      <span className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-teal rounded-bl-md" />
      <span className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-teal rounded-br-md" />

      <div className="relative overflow-hidden rounded-2xl border border-line">
        {children}
        {active && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 h-1/3"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, rgba(34,211,199,0.22) 45%, rgba(34,211,199,0.35) 50%, rgba(34,211,199,0.22) 55%, transparent 100%)",
            }}
            initial={{ y: "-120%" }}
            animate={{ y: ["-120%", "220%"] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>
    </div>
  );
}
