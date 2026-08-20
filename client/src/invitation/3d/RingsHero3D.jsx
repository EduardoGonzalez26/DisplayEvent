import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

const RingsScene = lazy(() => import("./RingsScene.jsx"));

/* ------------------------------------------------------------------
   Fallback estático para prefers-reduced-motion: dos elipses que
   sugieren los anillos entrelazados, sin animación ni WebGL.
------------------------------------------------------------------ */
function StaticRings() {
  return (
    <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
      <div className="relative opacity-90" style={{ width: "min(60vw, 230px)", aspectRatio: "1" }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: "10px solid var(--inv-primary-light, #d6c49b)",
            transform: "rotate(-20deg) scaleY(0.58)",
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: "10px solid var(--inv-accent-border-strong, #b4c09c)",
            transform: "rotate(20deg) scaleY(0.58)",
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Hero 3D: carga la escena R3F de forma perezosa, pausa el render
   cuando el canvas sale del viewport y enlaza el scroll para que la
   cámara se aleje / desvanezca conforme el usuario hace scroll.
------------------------------------------------------------------ */
export default function RingsHero3D() {
  const reduced = useReducedMotion();
  const wrapRef = useRef(null);
  const [visible, setVisible] = useState(false);

  // Progreso de scroll del hero (desde "empieza a verse" hasta que sale).
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
        <StaticRings />
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
            <RingsScene paused={!visible} scrollProgress={scrollYProgress} />
          </Suspense>
        </motion.div>
      )}
    </div>
  );
}