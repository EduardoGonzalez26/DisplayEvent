import { useEffect, useRef } from "react";
import CoverSection from "./v3/CoverSection.jsx";
import StorySection from "./v3/StorySection.jsx";
import IcebreakerSection from "./v3/IcebreakerSection.jsx";
import LocationSection from "./v3/LocationSection.jsx";
import DressCodeSection from "./v3/DressCodeSection.jsx";
import RecommendationsSection from "./v3/RecommendationsSection.jsx";
import TravelSection from "./v3/TravelSection.jsx";
import StaySection from "./v3/StaySection.jsx";
import RsvpSection from "./v3/RsvpSection.jsx";
import GiftsSection from "./v3/GiftsSection.jsx";
import ClosingSection from "./v3/ClosingSection.jsx";
import MusicToggle from "./MusicToggle.jsx";
import { NazariFrame, useV3Reveal } from "./v3/index.js";
import { V3 } from "./v3/assets.js";
import "./v3.css";

/* ------------------------------------------------------------------
   Motor de hojas apiladas (idéntico al v2, que ya funciona en producción):
   - Cada sección `[data-sheet]` es sticky; la hoja `[data-paper]` entra
     inclinada, se endereza y la anterior se hunde/oscurece.
   - En reposo se retira el `transform` para que los descendientes
     `position: fixed` (checkout de Stripe) se anclen al viewport.
   - `prefers-reduced-motion`: nunca se aplica transform.
   - Escucha scroll en fase de captura (ventana y contenedores internos,
     como la vista previa del editor).
------------------------------------------------------------------- */
function useStackedSheets(layoutKey) {
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

    // Altura de viewport estable SOLO en iOS. En iOS Safari `innerHeight`
    // cambia al colapsar/mostrar la barra de URL durante el scroll, mientras
    // el CSS usa `100svh` (estable): `top = min(0, vh - h)` variaba en pleno
    // scroll y las hojas saltaban. Fuera de iOS se mantiene `innerHeight` por
    // frame, exactamente como antes.
    const ua = navigator.userAgent || "";
    const isIOS =
      /iP(hone|ad|od)/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    let probe = null;
    let stableVh = 0;
    let lastW = 0;
    let lastH = 0;
    const measureVh = () => (probe && probe.offsetHeight) || window.innerHeight;
    if (isIOS) {
      probe = document.createElement("div");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText =
        "position:fixed;left:0;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none";
      root.appendChild(probe);
      stableVh = measureVh();
      lastW = window.innerWidth;
      lastH = window.innerHeight;
    }
    // Refresca la medida solo si cambió el ancho o la altura varió > ~120 px
    // (los cambios pequeños son la barra de URL y se ignoran).
    const refreshVh = () => {
      if (!probe) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w !== lastW || Math.abs(h - lastH) > 120) {
        lastW = w;
        lastH = h;
        stableVh = measureVh();
      }
    };

    const frame = () => {
      raf = 0;
      const vh = probe ? stableVh : window.innerHeight;
      const n = sheets.length;
      const margin = vh * 0.5;

      // Pasada 1: solo lecturas (un rect por hoja, reutilizado para p y e).
      for (let i = 0; i < n; i++) {
        const s = sheets[i];
        s.h = s.sec.offsetHeight;
        s.rt = s.sec.getBoundingClientRect().top;
      }

      // Pasada 2: solo escrituras.
      let topChanged = false;
      for (let i = 0; i < n; i++) {
        const s = sheets[i];
        const top = Math.min(0, vh - s.h);
        if (s.top !== top) {
          s.sec.style.top = `${top}px`;
          s.top = top;
          topChanged = true;
        }

        const nextTop = i + 1 < n ? sheets[i + 1].rt : null;
        // -1: lejos por debajo (en entrada), 1: lejos por encima (hundida), 0: cerca.
        const side =
          nextTop !== null && nextTop <= -margin ? 1 : s.rt >= vh + margin ? -1 : 0;
        // Las lejanas ya asentadas en su estado final no se tocan.
        if (side !== 0 && s.side === side) continue;
        s.side = side;

        // `will-change` dinámico (solo lo usa el CSS de iOS): hojas cercanas.
        if (s.paper) {
          const near = side === 0;
          if (s.near !== near) {
            if (near) s.paper.setAttribute("data-near", "");
            else s.paper.removeAttribute("data-near");
            s.near = near;
          }
        }

        const p = nextTop !== null ? clamp(1 - nextTop / vh) : 0;
        const e = i === 0 ? 1 : clamp(1 - s.rt / vh);
        const dir = i % 2 ? 1 : -1;

        if (s.paper) {
          const atRest = e === 1 && p === 0;
          let tf = "";
          if (!reduce && !atRest) {
            const inRot = (1 - e) * 3.2 * dir;
            const inX = (1 - e) * 4 * dir;
            const outRot = -p * 1.6 * dir;
            const sc = 1 - 0.08 * p;
            const ty = -p * 2.5;
            tf = `translate3d(${inX}%, ${ty}%, 0) rotate(${(inRot + outRot).toFixed(
              3
            )}deg) scale(${sc.toFixed(4)})`;
          }
          if ((s.tf ?? "") !== tf) {
            s.paper.style.transform = tf;
            s.tf = tf;
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

      // Si cambió algún `top` sticky, las posiciones leídas pudieron variar.
      if (topChanged) {
        for (const s of sheets) s.side = undefined;
        raf = requestAnimationFrame(frame);
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(frame);
    };

    const onResize = () => {
      refreshVh();
      onScroll();
    };

    onScroll();
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onScroll);
      ro.observe(root);
    }
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      ro?.disconnect();
      probe?.remove();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [layoutKey]);

  return rootRef;
}

function StackCard({ id, zIndex, children }) {
  return (
    <section data-sheet id={id} className="mjv3-sheet" style={{ zIndex }}>
      <div className="mjv3-sheet-pad">
        <div data-paper className="mjv3-paper algodon">
          <div data-shade className="mjv3-shade" aria-hidden="true" />
          <NazariFrame />
          <div
            data-rv={id}
            className="mjv3-sheet-content"
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function StackCardBare({ id, zIndex, children }) {
  return (
    <section data-sheet id={id} className="mjv3-sheet" style={{ zIndex }}>
      <div className="mjv3-sheet-pad">
        <div data-paper className="mjv3-paper algodon">
          <div data-shade className="mjv3-shade" aria-hidden="true" />
          <NazariFrame />
          <div data-rv={id} className="mjv3-sheet-content mjv3-sheet-content--bare">
            {children}
          </div>
        </div>
      </div>
    </section>
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
  hideBrand = false,
  paymentMethods = null,
}) {
  const locations = (cfg?.locations || []).filter(
    (item) => item && (String(item.label || "").trim() || String(item.place || "").trim())
  );
  const musicUrl = String(cfg?.music_url || "").trim();
  const showIcebreaker = !!cfg?.icebreaker?.enabled;
  const showRecommendations = !!cfg?.recommendations?.enabled;
  const showTravel = !!cfg?.trip?.enabled;
  const showStay = !!cfg?.stay?.enabled;
  const showGifts = !!cfg?.registry?.enabled;
  const preview = !!rsvp?.preview;
  // En la vista previa del editor las secciones se activan/desactivan en vivo.
  // El motor de hojas y el observador de revelado deben reconstruirse cuando
  // cambia la composición, o las secciones nuevas quedan sin observar/sticky.
  const layoutKey = [
    showIcebreaker,
    showRecommendations,
    showTravel,
    showStay,
    showGifts,
    locations.length,
  ].join("|");

  const containerRef = useStackedSheets(layoutKey);
  useV3Reveal(containerRef, layoutKey);

  // Deep link #confirmar: las hojas se montan con animaciones/reveal, así que
  // se reintenta el scroll en intervalos cortos hasta que la sección exista.
  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#confirmar") {
      return undefined;
    }
    const scrollToRsvp = () => {
      const target = document.getElementById("confirmar");
      if (target) target.scrollIntoView({ block: "start", behavior: "auto" });
    };
    const timers = [100, 400, 900].map((delay) => window.setTimeout(scrollToRsvp, delay));
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  let z = 1;
  const zCover = z++;
  const zStory = z++;
  const zIcebreaker = showIcebreaker ? z++ : z;
  const zLocations = z;
  z += Math.max(locations.length, 0);
  const zDress = z++;
  const zRecommendations = showRecommendations ? z++ : z;
  const zTravel = showTravel ? z++ : z;
  const zStay = showStay ? z++ : z;
  const zRsvp = z++;
  const zGifts = showGifts ? z++ : z;
  const zClosing = z++;

  return (
    <div
      ref={containerRef}
      className="mjv3"
      data-invitation-theme="boda_jorge_macarena"
    >
      <section
        data-sheet
        id="portada"
        className="mjv3-sheet"
        style={{ zIndex: zCover }}
      >
        <div data-paper className="mjv3-paper mjv3-paper--cover algodon">
          <div data-shade className="mjv3-shade" aria-hidden="true" />
          <NazariFrame cover />
          <CoverSection event={event} cfg={cfg} drawing={V3.portada} reveal={reveal} />
        </div>
      </section>

      <StackCard id="historia" zIndex={zStory}>
        <StorySection cfg={cfg} />
      </StackCard>

      {showIcebreaker && (
        <StackCard id="icebreaker" zIndex={zIcebreaker}>
          <IcebreakerSection cfg={cfg} />
        </StackCard>
      )}

      {locations.map((item, index) => (
        <StackCard
          key={`location-${index}`}
          id={index === 0 ? "ceremonia" : index === 1 ? "recepcion" : `ubicacion-${index}`}
          zIndex={zLocations + index}
        >
          <LocationSection
            item={item}
            index={index}
            event={event}
            themeLabels={theme?.labels}
          />
        </StackCard>
      ))}

      <StackCard id="vestimenta" zIndex={zDress}>
        <DressCodeSection cfg={cfg} />
      </StackCard>

      {showRecommendations && (
        <StackCard id="recomendaciones" zIndex={zRecommendations}>
          <RecommendationsSection cfg={cfg} />
        </StackCard>
      )}

      {showTravel && (
        <StackCard id="viaje" zIndex={zTravel}>
          <TravelSection cfg={cfg} />
        </StackCard>
      )}

      {showStay && (
        <StackCard id="hospedaje" zIndex={zStay}>
          <StaySection cfg={cfg} />
        </StackCard>
      )}

      <StackCard id="confirmar" zIndex={zRsvp}>
        <RsvpSection rsvp={rsvp} />
      </StackCard>

      {showGifts && (
        <StackCard id="regalo" zIndex={zGifts}>
          <GiftsSection
            cfg={cfg}
            token={token}
            publishableKey={publishableKey}
            paymentMethods={paymentMethods}
            preview={preview}
          />
        </StackCard>
      )}

      <StackCardBare id="cierre" zIndex={zClosing}>
        <ClosingSection event={event} cfg={cfg} hideBrand={hideBrand} />
      </StackCardBare>

      {musicUrl ? (
        <MusicToggle url={musicUrl} reveal={reveal} labels={theme?.labels} />
      ) : null}

      <div className="mjv3-grain" aria-hidden="true" />
    </div>
  );
}
