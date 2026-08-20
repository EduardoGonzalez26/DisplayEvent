import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { SectionTitle } from "../shared/util.jsx";
import { EASE, Reveal } from "../motion.jsx";

export default function BabyShowerGallery({ cfg }) {
  const images = cfg.gallery || [];
  if (images.length === 0) return null;

  return (
    <section className="py-24 px-4 bg-inv-bg-alt">
      <div className="max-w-4xl mx-auto">
        <SectionTitle eyebrow="Galería" title="Nuestros Mejores Recuerdos" />
        <GalleryShow images={images} />
      </div>
    </section>
  );
}

function GalleryShow({ images }) {
  const [index, setIndex] = useState(0);
  const [ratios, setRatios] = useState({});
  const [lastRatio, setLastRatio] = useState(16 / 10);
  const intervalRef = useRef(null);
  const ratiosRef = useRef({});
  const imgRefs = useRef([]);
  const reduced = useReducedMotion();

  const schedule = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 5000);
  }, [images.length]);

  useEffect(() => {
    schedule();
    return () => clearInterval(intervalRef.current);
  }, [schedule]);

  const go = (i) => {
    setIndex(i);
    schedule();
  };

  const syncRatios = useCallback(() => {
    let changed = false;
    imgRefs.current.forEach((el, i) => {
      const src = images[i];
      if (!el || !src || !el.naturalWidth || !el.naturalHeight) return;
      const r = Math.min(4, Math.max(0.4, el.naturalWidth / el.naturalHeight));
      if (ratiosRef.current[src] !== r) {
        ratiosRef.current[src] = r;
        changed = true;
      }
    });
    if (changed) setRatios({ ...ratiosRef.current });
  }, [images]);

  useEffect(() => {
    syncRatios();
  }, [syncRatios, index]);

  useEffect(() => {
    if (ratios[images[index]]) setLastRatio(ratios[images[index]]);
  }, [index, ratios, images]);

  const activeRatio = ratios[images[index]] || lastRatio;

  return (
    <Reveal>
      <div
        className="select-none"
        onMouseEnter={() => clearInterval(intervalRef.current)}
        onMouseLeave={schedule}
      >
        <div className="p-1.5 md:p-2 rounded-[2rem] bg-gradient-to-br from-inv-primary/40 via-transparent to-inv-primary/20">
          <div
            className="relative overflow-hidden rounded-[1.6rem] border border-inv-primary/30 shadow-2xl transition-[aspect-ratio] duration-500"
            style={{ aspectRatio: activeRatio }}
          >
            {images.map((src, i) => (
              <img
                key={`probe-${i}`}
                src={src}
                alt=""
                aria-hidden="true"
                ref={(el) => {
                  imgRefs.current[i] = el;
                }}
                onLoad={() => syncRatios()}
                className="hidden"
              />
            ))}

            <AnimatePresence initial={false}>
              <motion.img
                key={index}
                src={images[index]}
                alt={`Foto ${index + 1}`}
                className="absolute inset-0 h-full w-full object-cover"
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.12 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
                transition={{ opacity: { duration: 0.9, ease: EASE }, scale: { duration: 1.6, ease: EASE } }}
              />
            </AnimatePresence>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-inv-overlay/80 to-transparent" />

            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => go(i)}
                    aria-label={`Foto ${i + 1}`}
                    className={`h-1.5 transition-all duration-300 ${
                      i === index ? "w-7 bg-inv-text-light" : "w-1.5 bg-white/50 hover:bg-white/80"
                    }`}
                    style={{ borderRadius: 99 }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {images.length > 1 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {images.map((src, i) => (
              <motion.button
                key={i}
                onClick={() => go(i)}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }}
                whileHover={reduced ? undefined : { scale: 1.08 }}
                className={`h-14 w-14 overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                  i === index
                    ? "border-inv-text-light shadow-[0_0_18px_var(--inv-shadow-ring)]"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}