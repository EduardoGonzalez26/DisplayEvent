import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { EASE, Reveal } from "../motion.jsx";
import { GoldFrame, WeddingSectionTitle } from "./decor.jsx";

/* ------------------------------------------------------------------
   Galería botánica (Boda Jorge & Macarena): sección clara con la foto
   enmarcada en un marco botánico fino (verde/amarillo), contador en
   serif rosa/verde, dots y thumbnails con borde naranja/rosa activo.
   Copia el comportamiento de shared/Gallery: pre-carga de ratios,
   autoplay 5s con pausa en hover y transición ken-burns sutil
   (respetando prefers-reduced-motion).
------------------------------------------------------------------ */
export default function Gallery({ cfg, theme }) {
  const images = cfg.gallery || [];
  const reduced = useReducedMotion();
  const sectionRef = useRef(null);
  // La sección de galería NO es sticky (fluye normal), así que medir el
  // progreso sobre su propio contenedor es fiable: 0 cuando entra en el
  // viewport y 1 cuando sale por completo.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  // Parallax sutil vertical de la foto dentro de su marco (±12px).
  // Con reduced-motion el rango colapsa a 0 y el drift queda neutral.
  const frameY = useTransform(scrollYProgress, [0, 1], [
    reduced ? 0 : -12,
    reduced ? 0 : 12,
  ]);

  if (images.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-inv-bg-alt px-4 py-8 md:py-16"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-a),transparent_58%)]" />
      <div className="relative mx-auto max-w-4xl">
        <WeddingSectionTitle
          eyebrow={theme?.labels?.galleryEyebrow ?? "Galería"}
          title={theme?.labels?.gallery ?? "Momentos para Recordar"}
        />
        <GalleryShow images={images} frameY={frameY} />
      </div>
    </section>
  );
}

function GalleryShow({ images, frameY }) {
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

  const next = () => {
    setIndex((i) => (i + 1) % images.length);
    schedule();
  };

  const prev = () => {
    setIndex((i) => (i - 1 + images.length) % images.length);
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
        {/* Marco botánico fino de esquinas recortadas alrededor de la foto */}
        <GoldFrame accent className="rounded-[1.6rem] p-2.5 md:rounded-[2rem] md:p-3">
          <div
            className="relative max-md:max-h-[50dvh] w-full overflow-hidden rounded-[1.1rem] shadow-[0_40px_90px_var(--inv-shadow-soft)] transition-[aspect-ratio] duration-500 md:rounded-[1.5rem]"
            style={{ aspectRatio: activeRatio }}
          >
            {images.map((src, i) => (
              <img
                key={`probe-${src}-${i}`}
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

            {/* Parallax sutil: la foto deriva unos px dentro de su marco.
                Se aplica a un wrapper propio (NO al <img> con `kenburns`
                ni al wrapper del `drag`, para no chocar con sus transform).
                El contenedor con `overflow-hidden` recorta el deslizamiento;
                el `-inset-4` da sangrado para no dejar huecos al derivar. */}
            <motion.div
              className={`absolute ${reduced ? "inset-0" : "-inset-4"}`}
              style={{ y: frameY }}
            >
              <AnimatePresence initial={false}>
                <motion.div
                  key={index}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing"
                  drag={reduced ? false : "x"}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.15}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60) next();
                    else if (info.offset.x > 60) prev();
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ opacity: { duration: 0.9, ease: EASE } }}
                >
                  <motion.img
                    src={images[index]}
                    alt={`Foto ${index + 1}`}
                    className={`h-full w-full object-cover ${reduced ? "" : "kenburns"}`}
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#FDFBF7]/85 to-transparent" />

            {/* Contador en serif rosa/verde */}
            <div className="pointer-events-none absolute bottom-4 left-5 z-10 font-inv-heading text-sm tracking-[0.25em] tabular-nums text-[var(--inv-accent-pink)] md:text-base">
              {String(index + 1).padStart(2, "0")}
              <span className="text-[var(--inv-text-muted)]">
                {" "}
                / {String(images.length).padStart(2, "0")}
              </span>
            </div>

            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={`${images[i]}-${i}`}
                    onClick={() => go(i)}
                    aria-label={`Foto ${i + 1}`}
                    className={`h-1.5 transition-all duration-300 ${
                      i === index
                        ? "w-7 bg-[var(--inv-primary)]"
                        : "w-1.5 bg-[var(--inv-text-light)] hover:bg-[var(--inv-text-dim)]"
                    }`}
                    style={{ borderRadius: 99 }}
                  />
                ))}
              </div>
            )}
          </div>
        </GoldFrame>

        {/* Thumbnails con borde naranja/rosa activo */}
        {images.length > 1 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            {images.map((src, i) => (
              <motion.button
                key={`${src}-${i}`}
                onClick={() => go(i)}
                aria-label={`Ver foto ${i + 1}`}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }}
                whileHover={reduced ? undefined : { scale: 1.08 }}
                className={`h-14 w-14 overflow-hidden rounded-xl border-2 transition-all duration-300 md:h-16 md:w-16 ${
                  i === index
                    ? "border-[var(--inv-accent-pink)] shadow-[0_0_20px_var(--inv-shadow-ring)]"
                    : "border-[var(--inv-accent-border)] opacity-60 hover:border-[var(--inv-primary)] hover:opacity-100"
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
