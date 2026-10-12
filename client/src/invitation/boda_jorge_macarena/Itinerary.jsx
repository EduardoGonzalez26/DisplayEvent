import { Reveal } from "../motion.jsx";
import { Eyebrow, Flor, FlowerRule } from "./flora.jsx";
import { prettyTime } from "./helpers.js";

/* ------------------------------------------------------------------
   Itinerario (v2): riel vertical con hora en Cormorant a la derecha,
   nodo de flor sobre el riel y momento en microtexto con su lugar.

   - Cada item es `{ label, time }` del contrato. La sub-línea (lugar)
     se deriva de `cfg.locations` cuando existe una ubicación con el
     mismo `label` (así "Misa" muestra su dirección, como el mock);
     si no, la fila va sin sub-línea.
   - Flores alternadas granado / bugambilia / dalia / granado.
------------------------------------------------------------------ */

const NODE_FLOWERS = ["granado", "bugambilia", "dalia", "granado"];

export default function Itinerary({ cfg, theme }) {
  const labels = theme?.labels || {};
  const locations = (cfg?.locations || []).filter(
    (l) => l && String(l.place || "").trim()
  );
  const items = (cfg?.itinerary || [])
    .filter((it) => it && (String(it.label || "").trim() || String(it.time || "").trim()))
    .map((it) => {
      const label = String(it.label || "").trim();
      const match = locations.find(
        (l) => String(l.label || "").trim().toLowerCase() === label.toLowerCase()
      );
      return {
        label,
        time: prettyTime(it.time),
        place: match ? String(match.place).trim() : "",
      };
    });

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-5 px-6 pb-[120px] pt-24">
      <Reveal className="flex flex-col items-center gap-[22px] text-center">
        <Eyebrow>{labels.itineraryEyebrow || "Itinerario del día"}</Eyebrow>
        <FlowerRule kind="dalia" />
      </Reveal>

      <div className="relative mt-4 flex w-full max-w-[360px] flex-col gap-[38px]">
        {/* Riel vertical */}
        <div
          aria-hidden="true"
          className="absolute bottom-2.5 left-[95px] top-2.5 w-px bg-[var(--inv-accent-border-strong)]"
        />

        {items.map((it, i) => (
          <Reveal
            key={`${it.label || it.time || i}-${i}`}
            delay={i * 0.06}
            className="relative grid grid-cols-[72px_46px_1fr] items-center"
          >
            <div className="font-inv-display text-[28px] leading-none text-right tabular-nums text-[var(--inv-text)]">
              {it.time}
            </div>

            <div className="flex justify-center">
              <div className="h-[30px] w-[30px] rounded-full bg-[var(--inv-bg-alt2)] p-[3px]">
                <Flor kind={NODE_FLOWERS[i % NODE_FLOWERS.length]} />
              </div>
            </div>

            <div className="pl-1 text-left">
              {it.label && (
                <div className="text-[15px] font-semibold uppercase tracking-[0.18em] text-[var(--inv-text)]">
                  {it.label}
                </div>
              )}
              {it.place && (
                <div className="mt-0.5 text-[15px] leading-snug text-[var(--inv-text-muted)]">
                  {it.place}
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
