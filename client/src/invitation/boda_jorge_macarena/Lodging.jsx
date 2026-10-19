import { Reveal } from "../motion.jsx";
import { Eyebrow, Flor, FlowerRule } from "./flora.jsx";
import { isMapsUrl, mapsSearchUrl, safeHttpUrl } from "./helpers.js";

/* ------------------------------------------------------------------
   Hospedaje y viaje (v2): lista editorial de hoteles con filetes y
   enlaces "Mapa" / "Reservar", más una tarjeta blanca de viaje
   (aeropuerto + rutas + nota de cierre).

   - `cfg.lodging`: [{ name, note, url? }]. Si `url` es de mapas
     (Google/Apple/Waze) se usa para "Mapa"; si es una URL de reserva
     (Booking o web del hotel) se usa para "Reservar" y el mapa se genera
     por nombre. Sin `url`, solo se muestra el mapa generado.
   - `cfg.travel`: { title, airport_note, routes: [{label, note}],
     closing_note }. Cada bloque se pinta solo si tiene contenido.
   - Sin hospedaje NI viaje con contenido, la sección completa no se
     renderiza (el layout tampoco crea la tarjeta).
------------------------------------------------------------------ */
export default function Lodging({ cfg, theme }) {
  const labels = theme?.labels || {};

  const lodging = (cfg?.lodging || [])
    .filter((h) => h && (String(h.name || "").trim() || String(h.note || "").trim()))
    .map((h) => {
      const name = String(h.name || "").trim();
      const note = String(h.note || "").trim();
      const url = safeHttpUrl(h.url);
      const isMap = url ? isMapsUrl(url) : false;
      return {
        name,
        note,
        mapHref: (isMap ? url : "") || (name ? mapsSearchUrl(name) : ""),
        bookingHref: url && !isMap ? url : "",
      };
    });

  const travel = cfg?.travel || {};
  const travelTitle = String(travel.title || "").trim();
  const airportNote = String(travel.airport_note || "").trim();
  const closingNote = String(travel.closing_note || "").trim();
  const routes = (travel.routes || [])
    .filter((r) => r && (String(r.label || "").trim() || String(r.note || "").trim()))
    .map((r) => ({
      label: String(r.label || "").trim(),
      note: String(r.note || "").trim(),
    }));
  const hasTravel = !!(travelTitle || airportNote || closingNote || routes.length);

  if (lodging.length === 0 && !hasTravel) return null;

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-[22px] px-6 pb-[120px] pt-24 text-center">
      <Reveal className="flex flex-col items-center gap-[22px]">
        <Eyebrow>{labels.lodgingEyebrow || "Hospedaje y viaje"}</Eyebrow>
        <FlowerRule kind="granado" />
        <h2 className="m-0 font-inv-display text-[clamp(36px,8vw,50px)] font-normal leading-[1.08] text-[var(--inv-text)]">
          {labels.lodgingTitle || "Dónde quedarse"}
        </h2>
      </Reveal>

      {lodging.length > 0 && (
        <Reveal delay={0.05} className="flex w-full max-w-[460px] flex-col text-left">
          {lodging.map((h, i) => (
            <div
              key={`${h.name || h.note || i}-${i}`}
              className={`flex items-center justify-between gap-4 border-t border-[var(--inv-accent-border)] py-[18px] ${
                i === lodging.length - 1 ? "border-b" : ""
              }`}
            >
              <div className="min-w-0">
                {h.name && (
                  <div className="font-inv-display text-2xl font-medium leading-tight text-[var(--inv-text)]">
                    {h.name}
                  </div>
                )}
                {h.note && (
                  <div className="mt-0.5 text-[15px] leading-snug text-[var(--inv-text-muted)]">
                    {h.note}
                  </div>
                )}
              </div>
              {(h.mapHref || h.bookingHref) && (
                <div className="flex flex-none flex-col items-end gap-0.5">
                  {h.mapHref && (
                    <a
                      href={h.mapHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.16em] text-[var(--inv-text)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2"
                    >
                      {labels.lodgingMapLink || "Mapa"}
                    </a>
                  )}
                  {h.bookingHref && (
                    <a
                      href={h.bookingHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.16em] text-[var(--inv-text)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2"
                    >
                      {labels.lodgingReserveLink || "Reservar"}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </Reveal>
      )}

      {hasTravel && (
        <Reveal delay={0.1} className="mt-3 w-full max-w-[460px]">
          <div className="flex flex-col gap-[18px] border border-[var(--inv-accent-border)] bg-[var(--inv-surface)] px-5 py-6 text-left">
            {travelTitle && (
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-5 w-5 flex-none">
                  <Flor kind="bugambilia" />
                </span>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--inv-text)]">
                  {travelTitle}
                </div>
              </div>
            )}

            {airportNote && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--inv-text-muted)]">
                  {labels.travelAirportLabel || "Aeropuerto más cercano"}
                </div>
                <div className="mt-1 whitespace-pre-line text-base leading-[1.6] text-[var(--inv-text-soft)]">
                  {airportNote}
                </div>
              </div>
            )}

            {routes.map((r, i) => (
              <div key={`${r.label || r.note || i}-${i}`}>
                {r.label && (
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--inv-text-muted)]">
                    {r.label}
                  </div>
                )}
                {r.note && (
                  <div className="mt-1 whitespace-pre-line text-base leading-[1.6] text-[var(--inv-text-soft)]">
                    {r.note}
                  </div>
                )}
              </div>
            ))}

            {closingNote && (
              <p className="m-0 whitespace-pre-line border-t border-[var(--inv-accent-border)] pt-4 text-[15px] italic leading-[1.6] text-[var(--inv-text-muted)]">
                {closingNote}
              </p>
            )}
          </div>
        </Reveal>
      )}
    </div>
  );
}
