import { useEffect, useRef } from 'react';
import './NeuralBackground.css';

/**
 * Ambient, low-key canvas animation: soft nodes drifting with faint
 * connecting lines when close together — evokes a neural network /
 * feature-space visualization without being literal or distracting.
 * Pure canvas + rAF, no dependency, respects prefers-reduced-motion.
 */
export default function NeuralBackground({ density = 46 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width, height, points, animationId;

    function resize() {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    function init() {
      resize();
      const count = Math.min(density, Math.floor((width * height) / 18000));
      points = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.6 + 1,
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      for (const pt of points) {
        pt.x += pt.vx;
        pt.y += pt.vy;
        if (pt.x < 0 || pt.x > width) pt.vx *= -1;
        if (pt.y < 0 || pt.y > height) pt.vy *= -1;
      }

      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const a = points[i], b = points[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 130) {
            ctx.strokeStyle = `rgba(14, 124, 147, ${0.14 * (1 - dist / 130)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const pt of points) {
        ctx.fillStyle = 'rgba(14, 124, 147, 0.45)';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    }

    init();
    if (!prefersReduced) {
      draw();
    } else {
      // Draw a single static frame for reduced-motion users.
      draw();
      cancelAnimationFrame(animationId);
    }

    const onResize = () => init();
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
    };
  }, [density]);

  return <canvas ref={canvasRef} className="neural-bg" aria-hidden="true" />;
}
