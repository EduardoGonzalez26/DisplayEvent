import { useEffect, useMemo, useRef } from "react";
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
import { mexicanizeCfg } from "./v3/voice.js";
import { useBuildUpdates } from "./v3/useBuildUpdates.js";
import "./v3.css";

/* ------------------------------------------------------------------
   Motor de hojas apiladas:
   - Cada sección `[data-sheet]` es sticky; la hoja `[data-paper]` entra
     inclinada, se endereza y la anterior se hunde/oscurece.
   - Las posiciones se calculan a partir de offsets cacheados (no de los
     rects reales): con sticky, el rect de la hoja siguiente se queda en 0
     y las hojas ya tapadas nunca se daban por "lejanas".
   - Si el navegador soporta animaciones ligadas al scroll
     (`animation-timeline`), la inclinación y el oscurecido corren en el
     compositor y quedan siempre puestas: el JS fija los rangos (en resize)
     y en scroll solo marca `data-near` (capa de GPU preparada antes de que
     la hoja entre). Sin soporte, además escribe transform/opacity por
     frame.
   - En reposo no hay `transform`, para que los descendientes
     `position: fixed` (checkout de Stripe) se anclen al viewport.
   - `prefers-reduced-motion`: nunca se aplica transform.
   - En la vista previa del editor el scroll es de un contenedor interno:
     se usa siempre el motor por frame con ese contenedor.
------------------------------------------------------------------- */
function findScroller(el) {
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight + 1) return p;
  }
  return null;
}

function supportsScrollTimeline() {
  try {
    return !!window.CSS?.supports?.("animation-timeline: scroll()");
  } catch {
    return false;
  }
}

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

    const sheets = Array.from(root.querySelectorAll("[data-sheet]")).map((sec, i) => ({
      sec,
      paper: sec.querySelector("[data-paper]"),
      shade: sec.querySelector("[data-shade]"),
      dir: i % 2 ? 1 : -1,
    }));
    if (sheets.length === 0) return undefined;

    const scroller = findScroller(root);
    const sda = !reduce && !scroller && supportsScrollTimeline();
    if (sda) root.setAttribute("data-sda", "");
    for (const s of sheets) {
      if (s.paper) s.paper.style.setProperty("--mj-dir", String(s.dir));
    }
    if (sheets[0].paper) sheets[0].paper.setAttribute("data-first", "");

    const getScrollTop = () => (scroller ? scroller.scrollTop : window.scrollY);

    let raf = 0;
    let dirty = true;
    const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

    // Altura de viewport estable SOLO en iOS. En iOS Safari `innerHeight`
    // cambia al colapsar/mostrar la barra de URL durante el scroll, mientras
    // el CSS usa `100svh` (estable). Fuera de iOS se usa `innerHeight`.
    const ua = navigator.userAgent || "";
    const isIOS =
      /iP(hone|ad|od)/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    let probe = null;
    if (isIOS) {
      probe = document.createElement("div");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText =
        "position:fixed;left:0;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none";
      root.appendChild(probe);
    }
    let vh = 0;
    let lastW = 0;
    let lastH = 0;
    const readVh = () => {
      if (!probe) return window.innerHeight;
      // Solo se refresca si cambió el ancho o la altura varió > ~120 px
      // (los cambios pequeños son la barra de URL y se ignoran).
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (!vh || w !== lastW || Math.abs(h - lastH) > 120) {
        lastW = w;
        lastH = h;
        return probe.offsetHeight || h;
      }
      return vh;
    };

    // Lecturas de layout: solo en el arranque, resize o cambio de contenido.
    const measure = () => {
      vh = readVh();
      const rootRect = root.getBoundingClientRect();
      const base = scroller
        ? rootRect.top - scroller.getBoundingClientRect().top + scroller.scrollTop
        : rootRect.top + window.scrollY;
      let y = base + (parseFloat(getComputedStyle(root).paddingTop) || 0);
      for (const s of sheets) {
        s.h = s.sec.offsetHeight;
        s.docTop = y;
        y += s.h;
      }
      // Escrituras.
      const n = sheets.length;
      for (let i = 0; i < n; i++) {
        const s = sheets[i];
        const top = Math.min(0, vh - s.h);
        if (s.top !== top) {
          s.sec.style.top = `${top}px`;
          s.top = top;
        }
        if (sda && s.paper) {
          // Entrada: la hoja sube desde abajo del viewport hasta su sitio.
          // Salida: la siguiente hoja la cubre (y la oscurece).
          const inA = Math.round(s.docTop - vh);
          const inB = Math.round(s.docTop);
          const next = sheets[i + 1];
          const outRange = next
            ? `${Math.round(next.docTop - vh)}px ${Math.round(next.docTop)}px`
            : "10000000px 10000001px";
          s.paper.style.animationRange = `${inA}px ${inB}px, ${outRange}`;
          if (s.shade) s.shade.style.animationRange = outRange;
        }
        s.side = undefined;
      }
    };

    const setAttr = (el, name, on) => {
      if (!el) return;
      if (on) el.setAttribute(name, "");
      else el.removeAttribute(name);
    };

    const frame = () => {
      raf = 0;
      if (dirty) {
        dirty = false;
        measure();
      }
      const scrollY = getScrollTop();
      const n = sheets.length;
      const margin = vh * 0.5;

      for (let i = 0; i < n; i++) {
        const s = sheets[i];
        // Posición "virtual" (sin sticky) de esta hoja y de la siguiente.
        const rt = s.docTop - scrollY;
        const nextTop = i + 1 < n ? sheets[i + 1].docTop - scrollY : null;
        // -1: lejos por debajo, 1: ya cubierta (hundida), 0: cerca.
        const side =
          nextTop !== null && nextTop <= -margin ? 1 : rt >= vh + margin ? -1 : 0;
        if (side !== 0 && s.side === side) continue;
        const sideChanged = s.side !== side;
        s.side = side;

        // `data-near` solo da capa propia (will-change) medio viewport ANTES
        // de que la hoja entre: así se pinta fuera de pantalla. Sin esto el
        // navegador pintaba la hoja entera (con textura) en el mismo frame
        // en que arrancaba la animación = parpadeo. Las animaciones no se
        // tocan: con animation-timeline siguen siempre puestas.
        if (sideChanged) setAttr(s.paper, "data-near", side === 0);
        if (sda || reduce) continue;

        const p = nextTop !== null ? clamp(1 - nextTop / vh) : 0;
        const e = i === 0 ? 1 : clamp(1 - rt / vh);
        const dir = s.dir;

        if (s.paper) {
          const atRest = e === 1 && p === 0;
          let tf = "";
          if (!atRest) {
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
          if (s.op !== o) {
            s.shade.style.opacity = o;
            s.op = o;
          }
        }
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(frame);
    };

    const onLayoutChange = () => {
      dirty = true;
      onScroll();
    };

    onScroll();
    const scrollTarget = scroller || window;
    scrollTarget.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("orientationchange", onLayoutChange);
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onLayoutChange);
      // Cada hoja: un bloque que crece dentro de una hoja cambia su altura
      // (y su `top` sticky) y las posiciones de las siguientes.
      for (const s of sheets) ro.observe(s.sec);
    }
    return () => {
      scrollTarget.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("orientationchange", onLayoutChange);
      ro?.disconnect();
      probe?.remove();
      if (raf) cancelAnimationFrame(raf);
      root.removeAttribute("data-sda");
      for (const s of sheets) {
        if (s.paper) {
          s.paper.style.animationRange = "";
          s.paper.style.transform = "";
          s.paper.removeAttribute("data-near");
          s.paper.removeAttribute("data-sunk");
        }
        if (s.shade) {
          s.shade.style.animationRange = "";
          s.shade.style.opacity = "";
        }
      }
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
  cfg: rawCfg,
  theme,
  rsvp,
  reveal = true,
  token,
  publishableKey,
  paymentMethods = null,
}) {
  // Tono mexicano en los textos generales del evento (ver v3/voice.js).
  const cfg = useMemo(() => mexicanizeCfg(rawCfg), [rawCfg]);
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
  useBuildUpdates();
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
        <ClosingSection event={event} cfg={cfg} />
      </StackCardBare>

      {musicUrl ? (
        <MusicToggle url={musicUrl} reveal={reveal} labels={theme?.labels} />
      ) : null}

      <div className="mjv3-grain" aria-hidden="true" />
    </div>
  );
}
