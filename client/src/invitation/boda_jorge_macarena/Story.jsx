import { Reveal } from "../motion.jsx";
import { Eyebrow, FlowerRule } from "./flora.jsx";
import { displayNames } from "./helpers.js";

/* ------------------------------------------------------------------
   "Nuestra historia" (v2): foto enmarcada en blanco, ligeramente
   inclinada, en B&N; a su lado eyebrow, divisor con bugambilia, título
   editorial y el relato.

   - Texto: `cfg.story` (respeta saltos de línea) -> `cfg.message` ->
     mensaje por defecto del tema.
   - Título: `labels.storyTitle` o, si está vacío, `event.place` (mismo
     patrón del mock: "Granada y Ciudad de México").
   - Foto: determinista desde `cfg.gallery` (la decide el layout con el
     mecanismo PHOTO_ORDER); sin foto, el marco queda como papel.
------------------------------------------------------------------ */
export default function Story({ cfg, family, event, theme, photo }) {
  const labels = theme?.labels || {};
  const text =
    String(cfg?.story || "").trim() ||
    String(cfg?.message || "").trim() ||
    labels.defaultMessage?.(family) ||
    "";
  const title =
    String(labels.storyTitle || "").trim() || String(event?.place || "").trim();
  const names = displayNames(cfg);
  const alt = names.length ? names.join(" y ") : "Nuestra historia";

  return (
    <div className="mx-auto grid w-full max-w-[960px] grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-center gap-9 px-7 pb-28 pt-24">
      <Reveal>
        <div className="aspect-[4/5] rotate-[-1.5deg] bg-white p-2.5 shadow-[0_14px_30px_-18px_rgba(40,30,20,0.4)]">
          {photo ? (
            <img
              src={photo}
              alt={alt}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="h-full w-full object-cover [filter:grayscale(1)_contrast(1.05)]"
            />
          ) : (
            <div aria-hidden="true" className="h-full w-full bg-[var(--inv-bg-alt2)]" />
          )}
        </div>
      </Reveal>

      <Reveal delay={0.08} className="flex flex-col items-center gap-[22px] text-center">
        <Eyebrow>{labels.storyEyebrow || "Nuestra historia"}</Eyebrow>
        <FlowerRule kind="bugambilia" />
        {title && (
          <h2 className="m-0 font-inv-display text-[clamp(36px,8vw,50px)] font-normal leading-[1.08] text-[var(--inv-text)]">
            {title}
          </h2>
        )}
        {text && (
          <p className="m-0 max-w-[400px] whitespace-pre-line text-base leading-[1.8] text-[var(--inv-text-soft)] [text-wrap:pretty]">
            {text}
          </p>
        )}
      </Reveal>
    </div>
  );
}
