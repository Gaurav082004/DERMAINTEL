import { motion } from "framer-motion";
import Navbar from "../components/Navbar.jsx";
import Hero from "../components/Hero.jsx";
import FeatureCard from "../components/FeatureCard.jsx";
import Timeline from "../components/Timeline.jsx";
import Gallery from "../components/Gallery.jsx";
import Testimonial from "../components/Testimonial.jsx";
import FAQ from "../components/FAQ.jsx";
import Footer from "../components/Footer.jsx";
import ScanFrame from "../components/ScanFrame.jsx";
import { FEATURES, STATS, TESTIMONIALS } from "../data/content.js";

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-14">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="font-mono text-xs tracking-widest text-teal uppercase mb-3"
      >
        {eyebrow}
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.05 }}
        className="text-3xl sm:text-4xl font-semibold tracking-tight"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-3 text-muted"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />

      {/* Features */}
      <section id="features" className="px-6 py-24 max-w-7xl mx-auto">
        <SectionHeading
          eyebrow="Capabilities"
          title="Everything the analysis needs, nothing it doesn't"
          subtitle="Six focused capabilities carry the whole workflow, from upload to recommendation."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} index={i} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-24 max-w-7xl mx-auto">
        <SectionHeading
          eyebrow="Process"
          title="How it works"
          subtitle="Four steps, start to finish — no accounts full of extra configuration."
        />
        <Timeline />
      </section>

      {/* AI Showcase */}
      <section id="ai-showcase" className="px-6 py-24 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="font-mono text-xs tracking-widest text-teal uppercase mb-3">
              Under the hood
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
              A transfer-learned ResNet50, not a black box
            </h2>
            <p className="text-muted leading-relaxed mb-8">
              The classifier is built on a ResNet50 backbone fine-tuned for skin condition
              classification, paired with Grad-CAM so a prediction always comes with a visible
              reason behind it.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {STATS.map((s) => (
                <div key={s.label} className="glass rounded-xl p-4">
                  <p className="font-mono text-2xl text-teal">{s.value}</p>
                  <p className="text-xs text-muted mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <ScanFrame>
            <img
              src="https://images.unsplash.com/photo-1559757175-5700dde675bc?w=900&q=70"
              alt="AI model illustration"
              className="w-full h-[380px] object-cover"
            />
          </ScanFrame>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-24">
        <SectionHeading eyebrow="Context" title="Built around real dermatology imagery" />
        <Gallery />
      </section>

      {/* Testimonials */}
      <section className="px-6 py-24 max-w-7xl mx-auto">
        <SectionHeading
          eyebrow="Feedback"
          title="What early reviewers are saying"
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <Testimonial key={t.name} {...t} index={i} />
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-24">
        <SectionHeading eyebrow="Questions" title="Frequently asked questions" />
        <FAQ />
      </section>

      <Footer />
    </div>
  );
}
