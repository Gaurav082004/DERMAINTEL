import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FaRobot } from "react-icons/fa6";

const loadingSteps = [
  "Uploading image...",
  "Preprocessing image...",
  "Extracting features...",
  "Running ResNet50 model...",
  "Generating Grad-CAM...",
  "Preparing prediction...",
];

export default function Processing() {
  const navigate = useNavigate();

  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) {
          clearInterval(timer);

          setTimeout(() => {
            navigate("/result");
          }, 700);

          return 100;
        }

        return old + 2;
      });
    }, 120);

    return () => clearInterval(timer);
  }, [navigate]);

  useEffect(() => {
    if (progress < 20) setStep(0);
    else if (progress < 40) setStep(1);
    else if (progress < 60) setStep(2);
    else if (progress < 80) setStep(3);
    else if (progress < 95) setStep(4);
    else setStep(5);
  }, [progress]);

  return (
    <div className="min-h-screen bg-ink-radial flex justify-center items-center px-6">

      <motion.div
        initial={{ opacity: 0, scale: .95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl p-10 w-full max-w-xl text-center"
      >

        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "linear",
          }}
          className="w-24 h-24 rounded-full border-4 border-teal border-t-transparent mx-auto flex items-center justify-center"
        >

          <FaRobot className="text-4xl text-teal" />

        </motion.div>

        <h1 className="text-3xl font-bold mt-8">
          AI Analysis in Progress
        </h1>

        <p className="text-muted mt-3">
          Please wait while DERMAINTEL analyzes your skin image.
        </p>

        <div className="w-full h-4 bg-surface rounded-full overflow-hidden mt-10">

          <motion.div
            className="h-full bg-teal-blue-gradient"
            animate={{ width: `${progress}%` }}
          />

        </div>

        <p className="mt-3 font-semibold">
          {progress}%
        </p>

        <div className="mt-8">

          <motion.p
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-teal"
          >
            {loadingSteps[step]}
          </motion.p>

        </div>

      </motion.div>

    </div>
  );
}