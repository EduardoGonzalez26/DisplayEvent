import Countdown from "./Countdown.jsx";
import Hero from "./Hero.jsx";
import Message from "./Message.jsx";
import Itinerary from "./Itinerary.jsx";
import Locations from "./Locations.jsx";
import Gallery from "./Gallery.jsx";
import DressCode from "./DressCode.jsx";
import RegistryNote from "./RegistryNote.jsx";
import Footer from "./Footer.jsx";
import Gifts from "./Gifts.jsx";
import Padrinos from "./Padrinos.jsx";
import Rsvp from "../shared/Rsvp.jsx";
import SectionNav from "./SectionNav.jsx";

/* ------------------------------------------------------------------
   XV de Alice — composición "carta panel por panel" (tarjetas apiladas
   con sticky). Cada sección es una tarjeta que:

      1. Se queda fija arriba (`sticky top-0`).
      2. Tiene fondo sólido opaco (coincide con el de la sección interna).
      3. Tiene `min-h-[100dvh]` para tapar por completo a la anterior.
      4. Usa z-index creciente (la siguiente cubre a la anterior).
      5. Lleva acabado de tarjeta: esquinas superiores redondeadas,
         hairline botánico superior y sombra suave ascendente.

   Orden: Hero (z-0), Countdown+Message (z-10), Itinerary (z-20),
   Locations (z-30), Gallery (z-40), DressCode (z-50), RegistryNote
   (z-60), Gifts (z-70), Padrinos (z-75), Rsvp (z-80), Footer (z-90).

   Rsvp NO es sticky: la lista de invitados no tiene cota superior, por
   lo que fijarla a `100dvh` podría dejar invitados inaccesibles. Fluye
   normal (mantiene el acabado de tarjeta) y cubre a Padrinos al scrollear.

   Las secciones que devuelven `null` no dejan una tarjeta vacía: el
   layout replica sus condiciones de `return null` y omite el wrapper.
------------------------------------------------------------------ */

/* Canto superior botánico fino (hairline + rombo dorado) que marca el
   borde de cada tarjeta, coherente con los hairline/diamantes del tema. */
function CardEdge() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 pt-3 md:pt-4"
    >
      <span className="h-px w-20 bg-gradient-to-r from-transparent to-[var(--inv-botanical)]/40" />
      <span className="h-1.5 w-1.5 rotate-45 bg-[var(--inv-accent-yellow)]/70" />
      <span className="h-px w-20 bg-gradient-to-l from-transparent to-[var(--inv-botanical)]/40" />
    </div>
  );
}

/* Tarjeta apilable. `flow` = true para contenido que puede exceder el
   viewport (Gallery/Rsvp): no se fija, fluye normal manteniendo el
   acabado. */
function StackCard({ z, bg, flow = false, id, children }) {
  const finish =
    "relative overflow-hidden rounded-t-[1.6rem] shadow-[0_-18px_48px_-18px_var(--inv-shadow-deep)]";

  if (flow) {
    return (
      <div id={id} className={`${finish} ${z} ${bg}`}>
        <CardEdge />
        {children}
      </div>
    );
  }

  return (
    <div
      id={id}
      className={`${finish} ${z} ${bg} sticky top-0 flex min-h-[100dvh] flex-col justify-center`}
    >
      <CardEdge />
      {children}
    </div>
  );
}

export default function AliceXvLayout({
  event,
  family,
  cfg,
  theme,
  rsvp,
  reveal = true,
  token,
  publishableKey,
}) {
  // Evita un hueco con el contador cuando no hay fecha (o es inválida).
  const hasCountdown = (() => {
    if (!event.date) return false;
    const ts = new Date(`${event.date}T${event.time || "00:00:00"}`).getTime();
    return !Number.isNaN(ts);
  })();

  // Réplicas de las condiciones de `return null` de cada sección para no
  // renderizar tarjetas vacías de 100dvh.
  const showItinerary = (cfg.itinerary || []).length > 0;
  const showLocations = (cfg.locations || []).some(
    (it) => it && (it.place || it.label)
  );
  const showGallery = (cfg.gallery || []).length > 0;
  const showDressCode = (() => {
    const raw = cfg.dress_code || [];
    if (Array.isArray(raw)) return raw.length > 0;
    return (
      String(raw)
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean).length > 0
    );
  })();
  const showRegistryNote = String(cfg.registry_note || "").trim().length > 0;
  const showGifts = !!(cfg.registry && cfg.registry.enabled);
  const showPadrinos = (() => {
    const padrinos = (Array.isArray(cfg.padrinos) ? cfg.padrinos : [])
      .map((p) => (p && typeof p === "object" ? p.name : p) || "")
      .map((p) => (p || "").trim())
      .filter(Boolean);
    return padrinos.length > 0;
  })();

  // Puntos de la navegación lateral: una entrada por sección VISIBLE
  // (mismas condiciones que arriba). "Regalos" apunta a la nota si existe,
  // si no a la Mesa de Regalos (`mesa-regalos`).
  const sections = [
    { id: "carta", label: "Carta" },
    showItinerary && { id: "itinerario", label: "Itinerario" },
    showLocations && { id: "ubicaciones", label: "Ubicaciones" },
    showGallery && { id: "galeria", label: "Galería" },
    showDressCode && { id: "dresscode", label: "Dress Code" },
    (showRegistryNote || showGifts) && {
      id: showRegistryNote ? "regalos" : "mesa-regalos",
      label: "Regalos",
    },
    showPadrinos && { id: "padrinos", label: "Padrinos" },
    { id: "confirmaciones", label: "Confirmaciones" },
  ].filter(Boolean);

  return (
    <div>
      {/* Card 0 — portada (ya sticky h-dvh) */}
      <div className="sticky top-0 z-0" id="inicio">
        <Hero event={event} family={family} cfg={cfg} theme={theme} reveal={reveal} />
      </div>

      {/* Card 1 — contador + carta (el contador es pequeño) */}
      <StackCard z="z-10" bg="bg-inv-bg" id="carta">
        {hasCountdown && (
          <div className="px-4 pt-6 pb-6 md:pt-8 md:pb-10">
            <Countdown date={event.date} time={event.time} theme={theme} />
          </div>
        )}
        <Message cfg={cfg} family={family} theme={theme} />
      </StackCard>

      {/* Card 2 — itinerario */}
      {showItinerary && (
        <StackCard z="z-20" bg="bg-inv-bg" id="itinerario">
          <Itinerary cfg={cfg} theme={theme} />
        </StackCard>
      )}

      {/* Card 3 — ubicaciones */}
      {showLocations && (
        <StackCard z="z-30" bg="bg-inv-bg-alt2" id="ubicaciones">
          <Locations cfg={cfg} theme={theme} />
        </StackCard>
      )}

      {/* Card 4 — galería */}
      {showGallery && (
        <StackCard z="z-40" bg="bg-inv-bg-alt" flow id="galeria">
          <Gallery cfg={cfg} theme={theme} />
        </StackCard>
      )}

      {/* Card 5 — dress code */}
      {showDressCode && (
        <StackCard z="z-50" bg="bg-inv-bg" id="dresscode">
          <DressCode cfg={cfg} theme={theme} />
        </StackCard>
      )}

      {/* Card 6 — nota de regalos */}
      {showRegistryNote && (
        <StackCard z="z-60" bg="bg-inv-bg" id="regalos">
          <RegistryNote cfg={cfg} theme={theme} />
        </StackCard>
      )}

      {/* Card 7 — mesa de regalos */}
      {showGifts && (
        <StackCard z="z-70" bg="bg-inv-bg-alt2" id="mesa-regalos">
          <Gifts
            cfg={cfg}
            theme={theme}
            token={token}
            publishableKey={publishableKey}
          />
        </StackCard>
      )}

      {/* Card 7.5 — padrinos */}
      {showPadrinos && (
        <StackCard z="z-75" bg="bg-inv-bg" id="padrinos">
          <Padrinos cfg={cfg} theme={theme} />
        </StackCard>
      )}

      {/* Card 8 — RSVP (compartido): fluye normal, no sticky */}
      <StackCard z="z-80" bg="bg-inv-bg-alt" flow id="confirmaciones">
        <Rsvp {...rsvp} />
      </StackCard>

      {/* Card 9 — cierre */}
      <StackCard z="z-90" bg="bg-inv-bg-alt">
        <Footer event={event} theme={theme} cfg={cfg} />
      </StackCard>

      {/* Navegación lateral flotante (solo tras abrir el sobre) */}
      {reveal && (
        <SectionNav
          sections={sections}
          rsvpId="confirmaciones"
          topId="inicio"
        />
      )}
    </div>
  );
}
