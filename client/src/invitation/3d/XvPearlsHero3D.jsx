import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

const XvPearlsScene = lazy(() => import("./XvPearlsScene.jsx"));

/* ------------------------------------------------------------------
   Fallback estático para prefers-reduced-motion: perlas y resplandor
   dorado en CSS puro, sin WebGL ni animación.
------------------------------------------------------------------ */
function StaticPearls() {
  const pearls = [
    { left: "12%", top: "18%", size: 22, tint: "#fff8ec" },
    { left: "70%", top: "14%", size: 30, tint: "#f3e2cd" },
    { left: "80%", top: "58%", size: 18, tint: "#f7d3dd" },
    { left: "18%", top: "70%", size: 16, tint: "#f9e6c8" },
    { left: "48%", top: "30%", size: 12, tint: "#efe4f2" },
    { left: "32%", top: "55%", size: 24, tint: "#fff2dc" },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {pearls.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle at 32% 28%, #ffffff, ${p.tint} 55%, #d8c2a6)`,
            boxShadow:
              "0 6px 16px rgba(139, 94, 54, 0.25), inset -3px -4px 8px rgba(163, 81, 79, 0.15)",
          }}
        />
      ))}
      <span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255, 224, 178, 0.5), transparent 70%)",
          filter: "blur(6px)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------
   Hero de perlas 3D: carga perezosa, pausa fuera del viewport y enlaza
   el scroll para alejar/desvanecer la escena.
------------------------------------------------------------------ */
export default function XvPearlsHero3D({ pointer, active }) {
  const reduced = useReducedMotion();
  const wrapRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end start"],
  });
  const canvasOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div ref={wrapRef} className="absolute inset-0" aria-hidden="true">
      {reduced ? (
        <StaticPearls />
      ) : (
        <motion.div className="absolute inset-0" style={{ opacity: canvasOpacity }}>
          <Suspense
            fallback={
              <div
                className="absolute inset-0"
                style={{ background: "var(--inv-hero-fallback)" }}
              />
            }
          >
            <XvPearlsScene
              paused={!visible}
              scrollProgress={scrollYProgress}
              pointer={pointer}
              active={active}
            />
          </Suspense>
        </motion.div>
      )}
    </div>
  );
}