import Countdown from "./Countdown.jsx";
import Hero from "./Hero.jsx";
import SectionPhoto from "./SectionPhoto.jsx";
import Message from "./Message.jsx";
import Itinerary from "./Itinerary.jsx";
import Locations from "./Locations.jsx";
import Gallery from "./Gallery.jsx";
import DressCode from "./DressCode.jsx";
import RegistryNote from "./RegistryNote.jsx";
import Footer from "./Footer.jsx";
import Gifts from "./Gifts.jsx";
import Rsvp from "../shared/Rsvp.jsx";
import SectionNav from "./SectionNav.jsx";

/* ------------------------------------------------------------------
   Secciones que usan FONDO DE FOTO a pantalla completa (B&N + scrim).
   Una foto de `cfg.gallery` por sección, rotando por posición. Las demás
   secciones mantienen su fondo sólido de tema. Reasignar aquí.
------------------------------------------------------------------ */
const PHOTO_SECTIONS = ["itinerario", "ubicaciones", "dresscode", "cierre"];

/* ------------------------------------------------------------------
   Boda de Jorge & Macarena — composición "carta panel por panel"
   (tarjetas apiladas con sticky). Cada sección es una tarjeta que:

      1. Se queda fija arriba (`sticky top-0`).
      2. Tiene fondo OPACO (`bg-inv-bg`/`-alt`/`-alt2`): restaura el efecto
         "carta desplegable" y tapa por completo a la tarjeta anterior.
      3. Tiene `min-h-[100dvh]` para tapar por completo a la anterior.
      4. Usa z-index creciente (la siguiente cubre a la anterior).
      5. Lleva acabado de tarjeta: esquinas superiores redondeadas,
         hairline botánico superior y sombra suave ascendente.

   Orden: Hero (z-0, ya existente), Countdown+Message (z-10),
   Itinerary (z-20), Locations (z-30), Gallery (z-40), DressCode (z-50),
   RegistryNote (z-60), Gifts (z-70), Rsvp (z-80), Footer (z-90).

   Rsvp NO es sticky: la lista de invitados no tiene cota superior, por
   lo que fijarla a `100dvh` podría dejar invitados inaccesibles. Fluye
   normal (mantiene el acabado de tarjeta) y cubre a Gifts al scrollear.

   Las secciones que devuelven `null` no dejan una tarjeta vacía: el
   layout replica sus condiciones de `return null` y omite el wrapper.

   Fondo de foto: ALGUNAS tarjetas llevan, sobre su fondo opaco, una capa
   `absolute` con UNA foto de `cfg.gallery` a pantalla completa (B&N +
   scrim de degradado) vía `SectionPhoto`. Las demás conservan su fondo
   sólido (`bg-inv-bg`/`-alt`/`-alt2`). El fondo sigue siendo opaco, así
   que el efecto "carta desplegable" se mantiene sin multiplicar
   translucidez entre tarjetas.

   La lista `PHOTO_SECTIONS` decide QUÉ secciones llevan foto (y en qué
   orden rotan por `cfg.gallery`). Es el único punto a tocar para
   reasignarlas.
------------------------------------------------------------------ */

/* Canto superior botánico fino (hairline + rombo amarillo) que marca el
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
   viewport (Rsvp): no se fija, fluye normal manteniendo el acabado.

   Estructura por capas (todas ABSOLUTAS dentro del wrapper):
     1. Fondo OPACO de la tarjeta (`bg`) — restaura el efecto
        "carta desplegable" (sin translucidez ni backdrop-blur). Queda
        como base incluso con foto (la foto lo cubre por completo).
     2. `SectionPhoto` (solo si `photo`) — UNA foto a pantalla completa en
        B&N con scrim de degradado, entre el fondo opaco y el contenido.
     3. `CardEdge` y el contenido, envueltos en `relative` para quedar
        por encima de la foto.

   Mantener el fondo en una capa `absolute` propia (no en el wrapper) evita
   que el `<div>` de la tarjeta gane `backdrop-filter` y se convierta en
   contenedor de posicionamiento para descendientes `fixed` (p. ej. el modal
   de datos bancarios de Gifts), que siguen anclándose al viewport.

   `photo`: URL opcional. Sin ella (o con galería vacía) la tarjeta se
   comporta como antes: solo fondo sólido. */
function StackCard({ z, bg, flow = false, id, photo, children }) {
  const finish =
    "relative overflow-hidden rounded-t-[1.6rem] shadow-[0_-18px_48px_-18px_var(--inv-shadow-deep)]";

  const layers = (
    <>
      <div aria-hidden="true" className={`absolute inset-0 ${bg}`} />
      {photo ? <SectionPhoto src={photo} /> : null}
    </>
  );

  if (flow) {
    return (
      <div id={id} className={`${finish} ${z}`}>
        {layers}
        <CardEdge />
        <div className="relative">{children}</div>
      </div>
    );
  }

  return (
    <div
      id={id}
      className={`${finish} ${z} sticky top-0 flex min-h-[100dvh] flex-col justify-center`}
    >
      {layers}
      <CardEdge />
      <div className="relative">{children}</div>
    </div>
  );
}

export default function BodaJorgeMacarenaLayout({
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

  // Secciones con fondo de foto full-bleed en B&N (una foto de `cfg.gallery`
  // por sección). La POSICIÓN en esta lista decide qué foto le toca
  // (`gallery[i % length]`), rotando. Mover/añadir/quitar ids aquí para
  // reasignar secciones sin tocar el JSX de abajo. Si la galería está vacía,
  // `photoFor` devuelve `undefined` y TODAS las tarjetas quedan sólidas.
  const gallery = (cfg.gallery || []).filter(
    (s) => typeof s === "string" && s.trim()
  );
  const photoFor = (id) => {
    const i = PHOTO_SECTIONS.indexOf(id);
    if (i === -1 || gallery.length === 0) return undefined;
    return gallery[i % gallery.length];
  };

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
    { id: "confirmaciones", label: "Confirmaciones" },
  ].filter(Boolean);

  return (
    <div className="isolate">
      {/* Card 0 — portada (ya sticky h-dvh) */}
      <div className="sticky top-0 z-0" id="inicio">
        <Hero event={event} family={family} cfg={cfg} reveal={reveal} />
      </div>

      {/* Card 1 — contador + carta (el contador es pequeño) — fondo sólido */}
      <StackCard z="z-10" bg="bg-inv-bg" id="carta">
        {hasCountdown && (
          <div className="px-4 pt-6 pb-6 md:pt-8 md:pb-10">
            <Countdown date={event.date} time={event.time} theme={theme} />
          </div>
        )}
        <Message cfg={cfg} family={family} theme={theme} />
      </StackCard>

      {/* Card 2 — itinerario — FONDO DE FOTO */}
      {showItinerary && (
        <StackCard z="z-20" bg="bg-inv-bg" id="itinerario" photo={photoFor("itinerario")}>
          <Itinerary cfg={cfg} theme={theme} />
        </StackCard>
      )}

      {/* Card 3 — ubicaciones — FONDO DE FOTO */}
      {showLocations && (
        <StackCard z="z-30" bg="bg-inv-bg-alt2" id="ubicaciones" photo={photoFor("ubicaciones")}>
          <Locations cfg={cfg} theme={theme} />
        </StackCard>
      )}

      {/* Card 4 — galería — fondo sólido (ya muestra las fotos) */}
      {showGallery && (
        <StackCard z="z-40" bg="bg-inv-bg-alt" flow id="galeria">
          <Gallery cfg={cfg} theme={theme} />
        </StackCard>
      )}

      {/* Card 5 — dress code — FONDO DE FOTO */}
      {showDressCode && (
        <StackCard z="z-50" bg="bg-inv-bg" id="dresscode" photo={photoFor("dresscode")}>
          <DressCode cfg={cfg} theme={theme} />
        </StackCard>
      )}

      {/* Card 6 — nota de regalos — fondo sólido */}
      {showRegistryNote && (
        <StackCard z="z-60" bg="bg-inv-bg" id="regalos">
          <RegistryNote cfg={cfg} theme={theme} />
        </StackCard>
      )}

      {/* Card 7 — mesa de regalos — fondo sólido */}
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

      {/* Card 8 — RSVP (compartido): fluye normal, no sticky — fondo sólido */}
      <StackCard z="z-80" bg="bg-inv-bg-alt" flow id="confirmaciones">
        <Rsvp {...rsvp} />
      </StackCard>

      {/* Card 9 — cierre — FONDO DE FOTO */}
      <StackCard z="z-90" bg="bg-inv-bg-alt" id="cierre" photo={photoFor("cierre")}>
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
