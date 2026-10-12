import { useEffect, useRef } from "react";
import { GrainOverlay } from "./Grain.jsx";
import Hero from "./Hero.jsx";
import Story from "./Story.jsx";
import LocationSection from "./Locations.jsx";
import Itinerary from "./Itinerary.jsx";
import DressCode from "./DressCode.jsx";
import Gifts from "./Gifts.jsx";
import Lodging from "./Lodging.jsx";
import Footer from "./Footer.jsx";
import BottomNav from "./BottomNav.jsx";
import MusicToggle from "./MusicToggle.jsx";
import SectionPhoto from "./SectionPhoto.jsx";
import Rsvp from "../shared/Rsvp.jsx";
import { safeCssUrl } from "../shared/util.jsx";
import { mapsSearchUrl, safeHttpUrl } from "./helpers.js";

/* ------------------------------------------------------------------
   Orden FIJO de las tarjetas con fondo de foto. La POSICIÓN en esta
   lista decide qué foto de `cfg.gallery` le toca a cada id:
   `gallery[(i + offset) % length]`. Al ser un orden por id, una sección
   condicional oculta NO le roba la foto a las demás. Si la portada
   consume `gallery[0]` (sin `hero_image`), `offset` vale 1.
------------------------------------------------------------------ */
const PHOTO_ORDER = [
  "historia",
  "ceremonia",
  "recepcion",
  "itinerario",
  "vestimenta",
  "regalo",
  "confirmar",
  "hospedaje",
  "cierre",
];

/* ------------------------------------------------------------------
   Motor de hojas apiladas (equivalente al `frame()` del mock v2):

   - Cada sección `[data-sheet]` es un contenedor sticky; la hoja interior
     `[data-paper]` es la que se inclina/entra y se hunde/sale.
   - Cuando una sección es más alta que el viewport, se ajusta su `top`
     sticky a `vh - alto` (queda "clavada" pegada al fondo) para que todo
     su contenido sea alcanzable — como el mock.
   - La hoja entrante entra inclinada y se endereza; la anterior se hunde,
     gira levemente, se escala y se oscurece (`[data-shade]`).
   - Al estar la hoja en reposo (activa, sin vecina encima) se retira el
     `transform` por completo: así los descendientes `position: fixed`
     (modales de RSVP/Mesa de regalos) se anclan al viewport y no a la
     hoja. Con `prefers-reduced-motion` nunca se aplica transform.
   - Escucha `scroll` en fase de captura: funciona con scroll de ventana
     y con contenedores internos (vista previa del editor).
------------------------------------------------------------------ */
function useStackedSheets() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    let reduce = false;
    try {
      reduce = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* noop */
    }

    const sheets = Array.from(root.querySelectorAll("[data-sheet]")).map((sec) => ({
      sec,
      paper: sec.querySelector("[data-paper]"),
      shade: sec.querySelector("[data-shade]"),
      top: null,
      origin: null,
    }));
    if (sheets.length === 0) return undefined;

    let raf = 0;
    const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

    const frame = () => {
      raf = 0;
      const vh = window.innerHeight;

      for (const s of sheets) {
        const h = s.sec.offsetHeight;
        const top = Math.min(0, vh - h);
        if (s.top !== top) {
          s.sec.style.top = `${top}px`;
          s.top = top;
        }
      }

      for (let i = 0; i < sheets.length; i++) {
        const s = sheets[i];
        const next = sheets[i + 1];
        const p = next ? clamp(1 - next.sec.getBoundingClientRect().top / vh) : 0;
        const e = i === 0 ? 1 : clamp(1 - s.sec.getBoundingClientRect().top / vh);
        const dir = i % 2 ? 1 : -1;

        if (s.paper) {
          const atRest = e === 1 && p === 0;
          if (reduce || atRest) {
            if (s.paper.style.transform) s.paper.style.transform = "";
          } else {
            const inRot = (1 - e) * 3.2 * dir;
            const inX = (1 - e) * 4 * dir;
            const outRot = -p * 1.6 * dir;
            const sc = 1 - 0.08 * p;
            const ty = -p * 2.5;
            s.paper.style.transform = `translate3d(${inX}%, ${ty}%, 0) rotate(${(
              inRot + outRot
            ).toFixed(3)}deg) scale(${sc.toFixed(4)})`;
          }
        }

        if (s.shade) {
          const o = (p * 0.5).toFixed(3);
          if (s.origin !== o) {
            s.shade.style.opacity = o;
            s.origin = o;
          }
        }
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(frame);
    };

    onScroll();
    // Fase de captura: capta scroll de ventana Y de contenedores internos.
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onScroll);
      ro.observe(root);
    }
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return rootRef;
}

/* ------------------------------------------------------------------
   Hoja apilable (v2): sección sticky con padding lateral fluido; dentro,
   el papel (máx. 1200px) con fondo opaco claro, sombra ascendente,
   filete interior y pluma superior (gradiente cálido). Capas:
     1. Fondo opaco del papel.
     2. `SectionPhoto` — foto B&N con scrim claro del tema (opcional).
     3. `[data-shade]` — oscurecimiento por la hoja entrante.
     4. Marco interior + pluma (z-8/9) y contenido (z-10).
------------------------------------------------------------------ */
function StackCard({
  id,
  zIndex,
  bg = "bg-inv-bg-alt",
  photo,
  photoPriority = false,
  contentAlign = "center",
  contentClassName = "",
  children,
}) {
  return (
    <section data-sheet id={id} className="sticky top-0" style={{ zIndex }}>
      <div className="px-[clamp(8px,3vw,56px)]">
        <div
          data-paper
          className={`relative mx-auto flex min-h-[100svh] max-w-[1200px] flex-col overflow-hidden will-change-transform ${bg} shadow-[0_-22px_44px_-14px_rgba(0,0,0,0.5)]`}
        >
          <div
            data-shade
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[6] bg-[#0E0D0C] opacity-0"
          />
          {photo ? <SectionPhoto src={photo} priority={photoPriority} /> : null}

          {/* Marco interior (hairline a 12px) y pluma superior cálida */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-3 z-[8] border border-[var(--inv-card-frame,#E2DACD)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-[9] h-[34px] bg-[linear-gradient(to_bottom,rgba(60,40,20,0.08),rgba(60,40,20,0))]"
          />

          <div
            className={`relative z-10 flex flex-1 flex-col ${
              contentAlign === "center" ? "justify-center" : ""
            } ${contentClassName}`}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   Boda de Jorge & Macarena (rediseño v2): sobre editorial en
   InvitationView y, al abrirse, la página queda compuesta por hojas
   apiladas en el orden del mock:

     Portada · Nuestra historia · Ceremonia/Recepción (una hoja por
     `cfg.locations`) · Itinerario · Vestimenta · Regalo ·
     Confirmación · Hospedaje y viaje · Cierre

   Navegación: pill inferior (Ubicación / Regalo / Confirmar) + botón
   de música, visibles al abrir el sobre. RSVP, Gifts y el badge Webi
   conservan su lógica original.
------------------------------------------------------------------ */
export default function BodaJorgeMacarenaLayout({
  event,
  family,
  cfg,
  theme,
  rsvp,
  reveal = true,
  token,
  publishableKey,
  hideBrand = false,
}) {
  const containerRef = useStackedSheets();

  // Fotos de `cfg.gallery` como fondo de las hojas. `offset` = 1 cuando la
  // portada ya consume `gallery[0]` (no hay `hero_image` válida).
  const gallery = (cfg.gallery || []).filter(
    (s) => typeof s === "string" && s.trim()
  );
  const photoOffset = !safeCssUrl(cfg.hero_image) && gallery.length > 0 ? 1 : 0;
  const photoFor = (name) => {
    const i = PHOTO_ORDER.indexOf(name);
    if (i === -1 || gallery.length === 0) return undefined;
    return gallery[(i + photoOffset) % gallery.length];
  };
  // Foto de cada hoja de ubicación (ceremonia, recepción y extra).
  const photoForLocation = (i) => {
    if (gallery.length === 0) return undefined;
    return gallery[(1 + i + photoOffset) % gallery.length];
  };

  // Réplicas de los `return null` de cada sección para no crear hojas
  // vacías de 100dvh.
  const locations = (cfg.locations || []).filter(
    (l) =>
      l &&
      (String(l.label || "").trim() || String(l.place || "").trim())
  );
  const itineraryItems = (cfg.itinerary || []).filter(
    (it) =>
      it && (String(it.label || "").trim() || String(it.time || "").trim())
  );
  const dressItems = (() => {
    const raw = cfg.dress_code || [];
    if (Array.isArray(raw)) {
      return raw
        .map((d) => (typeof d === "object" && d ? String(d.label || "") : String(d || "")))
        .filter((s) => s.trim());
    }
    return String(raw)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  })();
  const showGifts = !!(cfg.registry && cfg.registry.enabled);
  const showRegistryNote = String(cfg.registry_note || "").trim().length > 0;
  const showGiftSection = showGifts || showRegistryNote;
  const lodgingItems = (cfg.lodging || []).filter(
    (h) => h && (String(h.name || "").trim() || String(h.note || "").trim())
  );
  const travel = cfg.travel || {};
  const showTravel = !!(
    String(travel.title || "").trim() ||
    String(travel.airport_note || "").trim() ||
    String(travel.closing_note || "").trim() ||
    (travel.routes || []).some(
      (r) => r && (String(r.label || "").trim() || String(r.note || "").trim())
    )
  );
  const showLodging = lodgingItems.length > 0 || showTravel;

  const musicUrl = String(cfg.music_url || "").trim();

  // z-index creciente de las hojas (por debajo del chrome fijo z-60).
  const zHistoria = 2;
  const zLocations = 3; // 3, 4, 5…
  const zItinerary = zLocations + Math.max(locations.length, 0);
  const zDress = zItinerary + 1;
  const zGift = zDress + 1;
  const zRsvp = zGift + 1;
  const zLodging = zRsvp + 1;
  const zClosing = zLodging + 1;

  // Pill inferior: solo las secciones que existen.
  const navItems = [
    locations.length > 0 && {
      id: "ubicacion-0",
      label: theme?.labels?.navLocations || "Ubicación",
    },
    showGiftSection && {
      id: "regalo",
      label: theme?.labels?.navGift || "Regalo",
    },
    {
      id: "confirmar",
      label: theme?.labels?.navRsvp || "Confirmar",
      primary: true,
    },
  ].filter(Boolean);

  return (
    <div ref={containerRef} className="isolate bg-[#1A1918]">
      {/* Hoja 1 — Portada */}
      <Hero event={event} cfg={cfg} reveal={reveal} theme={theme} />

      {/* Hoja 2 — Nuestra historia */}
      <StackCard
        id="historia"
        zIndex={zHistoria}
        bg="bg-inv-bg-alt"
      >
        <Story
          cfg={cfg}
          family={family}
          event={event}
          theme={theme}
          photo={photoFor("historia")}
        />
      </StackCard>

      {/* Hojas 3+ — Ceremonia / Recepción (una por ubicación) */}
      {locations.map((item, i) => (
        <StackCard
          key={`ubicacion-${i}`}
          id={`ubicacion-${i}`}
          zIndex={zLocations + i}
          bg={i % 2 === 0 ? "bg-inv-bg-alt2" : "bg-inv-bg-alt"}
          photo={photoForLocation(i)}
        >
          <LocationSection
            item={item}
            index={i}
            event={event}
            theme={theme}
            linkUrl={
              safeHttpUrl(item.url) ||
              (String(item.place || "").trim()
                ? mapsSearchUrl(item.place)
                : null)
            }
          />
        </StackCard>
      ))}

      {/* Itinerario */}
      {itineraryItems.length > 0 && (
        <StackCard
          id="itinerario"
          zIndex={zItinerary}
          bg="bg-inv-bg-alt2"
          photo={photoFor("itinerario")}
        >
          <Itinerary cfg={cfg} theme={theme} />
        </StackCard>
      )}

      {/* Vestimenta */}
      {dressItems.length > 0 && (
        <StackCard
          id="vestimenta"
          zIndex={zDress}
          bg="bg-inv-bg-alt"
          photo={photoFor("vestimenta")}
        >
          <DressCode cfg={cfg} theme={theme} />
        </StackCard>
      )}

      {/* Regalo (nota + Mesa de Regalos) */}
      {showGiftSection && (
        <StackCard
          id="regalo"
          zIndex={zGift}
          bg="bg-inv-bg-alt2"
          photo={photoFor("regalo")}
        >
          <Gifts
            cfg={cfg}
            theme={theme}
            token={token}
            publishableKey={publishableKey}
          />
        </StackCard>
      )}

      {/* Confirmación (shared/Rsvp): su <section> raíz pinta fondo opaco;
          se neutraliza SOLO desde el wrapper local. */}
      <StackCard
        id="confirmar"
        zIndex={zRsvp}
        bg="bg-inv-bg-alt"
        photo={photoFor("confirmar")}
        contentClassName="[&>section]:bg-transparent"
      >
        <Rsvp {...rsvp} />
      </StackCard>

      {/* Hospedaje y viaje */}
      {showLodging && (
        <StackCard
          id="hospedaje"
          zIndex={zLodging}
          bg="bg-inv-bg-alt2"
          photo={photoFor("hospedaje")}
        >
          <Lodging cfg={cfg} theme={theme} />
        </StackCard>
      )}

      {/* Cierre */}
      <StackCard
        id="cierre"
        zIndex={zClosing}
        bg="bg-inv-bg-alt"
        contentAlign="stretch"
      >
        <Footer
          event={event}
          theme={theme}
          cfg={cfg}
          hideBrand={hideBrand}
          photo={photoFor("cierre")}
        />
      </StackCard>

      {/* Navegación inferior + música (aparecen al abrir el sobre) */}
      {navItems.length > 0 && <BottomNav items={navItems} reveal={reveal} />}
      <MusicToggle url={musicUrl} reveal={reveal} labels={theme?.labels} />

      {/* Textura de papel del diseño (grano fino sobre todo) */}
      <GrainOverlay />
    </div>
  );
}
