import { GALLERY_IMAGES } from "../data/content.js";

export default function Gallery() {
  const loop = [...GALLERY_IMAGES, ...GALLERY_IMAGES];

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ink to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ink to-transparent z-10" />
      <div className="flex gap-6 w-max animate-marquee">
        {loop.map((src, i) => (
          <div
            key={i}
            className="w-72 h-48 rounded-2xl overflow-hidden border border-line shrink-0"
          >
            <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}
