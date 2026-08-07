import { motion } from "framer-motion";
import { GALLERY_IMAGES } from "../data/content.js";
import { FaExpand } from "react-icons/fa6";

export default function Gallery() {
  return (
    <section className="max-w-7xl mx-auto px-6">

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-14"
      >
        <p className="uppercase tracking-[4px] text-teal font-semibold mb-2">
          Gallery
        </p>

        <h2 className="text-4xl font-bold mb-4">
          Dermatology Image Collection
        </h2>

        <p className="text-muted max-w-3xl mx-auto leading-7">
          DERMAINTEL is trained using high-quality dermatology images.
          Our gallery demonstrates the variety of skin conditions,
          medical examinations, and AI-assisted healthcare environments.
        </p>
      </motion.div>

      {/* Gallery Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {GALLERY_IMAGES.map((image, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
            }}
            whileHover={{
              y: -8,
            }}
            className="group relative overflow-hidden rounded-3xl glass border border-teal/20"
          >
            <img
              src={image}
              alt={`Dermatology ${index + 1}`}
              loading="lazy"
              className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-110"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">

              <div className="flex justify-between items-center">

                <div>
                  <h3 className="text-white font-semibold text-lg">
                    Medical Image {index + 1}
                  </h3>

                  <p className="text-gray-300 text-sm">
                    Dermatology Dataset
                  </p>
                </div>

                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white">
                  <FaExpand />
                </div>

              </div>

            </div>

          </motion.div>
        ))}
      </div>

    </section>
  );
}