import { Reveal } from "../motion.jsx";
import { Eyebrow, FlowerRule } from "./flora.jsx";

/* ------------------------------------------------------------------
   Código de vestimenta (v2): eyebrow, divisor con bugambilia y la(s)
   etiqueta(s) en Cormorant de gran tamaño (el `[ETIQUETA]` del mock).
   Acepta `dress_code` como array canónico `[{ label }]` o como string
   con saltos de línea (legacy). La nota va como cita itálica.

   Paridad de null con shared/DressCode: sin entradas no se renderiza
   (el layout tampoco crea la tarjeta).
------------------------------------------------------------------ */
export default function DressCode({ cfg, theme }) {
  const raw = cfg?.dress_code || [];
  const labels = Array.isArray(raw)
    ? raw
        .map((d) => (typeof d === "object" && d ? String(d.label || "") : String(d || "")))
        .map((s) => s.trim())
        .filter(Boolean)
    : String(raw)
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

  if (labels.length === 0) return null;

  const note = String(cfg?.dress_note || "").trim();
  const t = theme?.labels || {};

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-[22px] px-7 pb-[120px] pt-24 text-center">
      <Reveal className="flex flex-col items-center gap-[22px]">
        <Eyebrow>{t.dressCodeEyebrow || "Código de vestimenta"}</Eyebrow>
        <FlowerRule kind="bugambilia" />

        {labels.map((label, i) => (
          <h2
            key={`${label}-${i}`}
            className="m-0 font-inv-display text-[clamp(42px,11vw,72px)] font-normal leading-[1.05] text-[var(--inv-text)]"
          >
            {label}
          </h2>
        ))}

        {note && (
          <p className="mt-3 max-w-[440px] font-inv-display text-xl italic leading-[1.7] text-[var(--inv-text-muted)]">
            {note}
          </p>
        )}
      </Reveal>
    </div>
  );
}
