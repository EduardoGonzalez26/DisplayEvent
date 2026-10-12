import { Reveal } from "../motion.jsx";
import { Eyebrow, FlowerRule } from "./flora.jsx";
import { prettyTime } from "./helpers.js";

/* ------------------------------------------------------------------
   Ceremonia / Recepción (v2): UNA tarjeta por item de `cfg.locations`
   (label -> título, place -> texto, url -> enlace "Cómo llegar").
   Mismo esqueleto del mock: eyebrow, flor, título Cormorant grande,
   dirección, caja "Hora" con filetes y CTA de mapa en tinta.

   - El eyebrow sale de `labels.locationEyebrows[índice]` (["Ceremonia
     religiosa", "Recepción y fiesta"]) con fallback a
     `labels.locationsEyebrow`.
   - La hora es `event.time`; si viene vacía o es el placeholder de
     medianoche ("00:00"), la caja no se renderiza.
   - El enlace usa `url` si es una URL http(s) válida; si no, una
     búsqueda de Google Maps por `place`.
------------------------------------------------------------------ */

const FLOWERS = ["granado", "dalia", "bugambilia"];

/* Eyebrow de cada tarjeta: si la etiqueta del lugar identifica una
   ceremonia (misa, iglesia…) o una recepción (celebración, cena…), se usa
   el eyebrow correspondiente del tema (como el mock: "Ceremonia
   religiosa" / "Recepción y fiesta"). Con etiquetas libres se cae al
   eyebrow por índice y, si no, al genérico. */
const CEREMONY_RE = /(misa|ceremonia|iglesia|templo|catedral|capilla)/i;
const RECEPTION_RE =
  /(recepcion|recepción|celebraci|celebración|cena|fiesta|banquete|c[óo]ctel|jard[íi]n)/i;

function eyebrowFor(label, index, labels) {
  const list = labels.locationEyebrows;
  const l = String(label || "");
  if (CEREMONY_RE.test(l)) return list?.[0];
  if (RECEPTION_RE.test(l)) return list?.[1];
  return list?.[index] || labels.locationsEyebrow;
}

function MapPinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export default function LocationSection({ item, index = 0, event, theme, linkUrl }) {
  const labels = theme?.labels || {};
  const eyebrow =
    eyebrowFor(item?.label, index, labels) || "Ceremonia y recepción";
  const title = String(item?.label || "").trim() || `Ubicación ${index + 1}`;
  const place = String(item?.place || "").trim();
  const time = prettyTime(event?.time);

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-[22px] px-7 pb-[120px] pt-24 text-center">
      <Reveal className="flex flex-col items-center gap-[22px]">
        <Eyebrow>{eyebrow}</Eyebrow>
        <FlowerRule kind={FLOWERS[index % FLOWERS.length]} />

        <h2 className="m-0 font-inv-display text-[clamp(38px,9vw,60px)] font-normal leading-[1.05] text-[var(--inv-text)]">
          {title}
        </h2>

        {place && (
          <p className="m-0 text-base leading-[1.7] text-[var(--inv-text-soft)]">
            {place}
          </p>
        )}

        {time && (
            <div className="flex w-full max-w-[260px] flex-col items-center gap-1 border-y border-[var(--inv-accent-border)] py-3.5">
            <div className="text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--inv-text-muted)]">
              {labels.locationTimeLabel || "Hora"}
            </div>
            <div className="font-inv-display text-[32px] font-normal leading-none tabular-nums text-[var(--inv-text)]">
              {time}
            </div>
          </div>
        )}

        {linkUrl && place ? (
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener"
            className="flex min-h-[56px] w-full max-w-[300px] items-center justify-center gap-2.5             rounded-[2px] bg-[#1C1B19] px-[30px] text-[13px] font-medium uppercase tracking-[0.2em] text-[#FAF7F2] no-underline transition-colors hover:bg-[#3A3733] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2"
          >
            <MapPinIcon />
            {labels.locations || "Cómo llegar"}
          </a>
        ) : null}
      </Reveal>
    </div>
  );
}

