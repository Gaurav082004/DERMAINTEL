export const NAV_LINKS = [
  { label: "Home", to: "/#home" },
  { label: "Features", to: "/#features" },
  { label: "How It Works", to: "/#how-it-works" },
  { label: "About", to: "/#ai-showcase" },
  { label: "Contact", to: "/#footer" },
];

export const FEATURES = [
  {
    icon: "FaMagnifyingGlass",
    title: "AI Disease Detection",
    desc: "A ResNet50-based model reads the uploaded image and flags the most likely skin condition in seconds.",
  },
  {
    icon: "FaLayerGroup",
    title: "Grad-CAM Visualization",
    desc: "See exactly which regions of the image influenced the prediction, not just a bare percentage.",
  },
  {
    icon: "FaCloudSun",
    title: "Environmental Analysis",
    desc: "UV index, air quality, and local weather are folded into your risk score, not treated as an afterthought.",
  },
  {
    icon: "FaListCheck",
    title: "Personalized Recommendations",
    desc: "Guidance is generated from your specific result and environment, not a generic skincare checklist.",
  },
  {
    icon: "FaClockRotateLeft",
    title: "Prediction History",
    desc: "Every scan is saved, so changes in your skin are something you can actually track over time.",
  },
  {
    icon: "FaBolt",
    title: "Fast Analysis",
    desc: "Inference runs in the background the moment you upload — no waiting on a full page reload.",
  },
];

export const STEPS = [
  { step: 1, title: "Upload image", desc: "Drop in a clear photo of the affected skin area." },
  { step: 2, title: "AI analyzes", desc: "The model runs inference and cross-checks local environmental data." },
  { step: 3, title: "Prediction generated", desc: "You get a classification with a confidence score and Grad-CAM overlay." },
  { step: 4, title: "View recommendations", desc: "Personalized, environment-aware next steps are laid out for you." },
];

export const STATS = [
  { value: "95%+", label: "Validation Accuracy" },
  { value: "ResNet50", label: "Model Backbone" },
  { value: "CNN", label: "Architecture Class" },
  { value: "Real-time", label: "Inference Speed" },
];

export const TESTIMONIALS = [
  {
    name: "Dr. Anika Rao",
    role: "Dermatologist",
    quote:
      "The Grad-CAM overlay is what sold me — it shows its work instead of just handing back a label.",
  },
  {
    name: "Meera Suresh",
    role: "Final-year CS Student",
    quote:
      "Watching an actual ResNet50 pipeline turn into a usable product was the best part of studying this space.",
  },
  {
    name: "Prof. Devan Iyer",
    role: "ML Researcher",
    quote:
      "Folding environmental signals into the risk score is a small detail that most tools skip entirely.",
  },
];

export const FAQS = [
  {
    q: "Is DERMAINTEL a replacement for a dermatologist?",
    a: "No. It's an early-detection and awareness aid — always confirm any result with a qualified professional.",
  },
  {
    q: "What kind of images work best?",
    a: "Clear, well-lit, close-up photos of the affected area, taken without heavy filters or obstructions.",
  },
  {
    q: "How is my environmental data used?",
    a: "Your location's UV index, air quality, and weather are combined with your result to shape the risk score and recommendations.",
  },
  {
    q: "Is my prediction history private?",
    a: "Yes — history is tied to your account and is not shared or shown to other users.",
  },
];

export const GALLERY_IMAGES = [
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=60",
  "https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&q=60",
  "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=600&q=60",
  "https://images.unsplash.com/photo-1580281657702-257584239a55?w=600&q=60",
  "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&q=60",
  "https://images.unsplash.com/photo-1550831107-1553da8c8464?w=600&q=60",
];
