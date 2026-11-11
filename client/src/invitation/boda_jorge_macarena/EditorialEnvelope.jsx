import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { displayNames, initialsOf } from "./helpers.js";
import "./v3.css";

/* ------------------------------------------------------------------
   Sobre v3 — variante de `boda_jorge_macarena` seleccionada con
   `opening.envelopeVariant: "editorial"`.

   Secuencia y tiempos del prototipo:
     sobre → solapa abre → sello se desvanece → carta sube →
     la carta se expande a pantalla completa → fundido a la página.

   Papel blanco/algodón, sello gris "M&J" sin flores. Respeta
   `prefers-reduced-motion` (R = 0.35) y bloquea el scroll mientras
   está montado.
------------------------------------------------------------------- */

function familyLine(value) {
  const family = String(value || "").trim();
  if (!family) return "";
  return /^familia\b/i.test(family) ? family : `la Familia ${family}`;
}

export default function EditorialEnvelope({ family, cfg = {}, opening, onOpen }) {
  const reduced = useReducedMotion();
  const config = opening?.editorial || {};
  const kicker = config.kicker || "Una invitación para";
  const letterKicker = config.letterKicker || "Nos casamos";
  const hint = config.hint || "Toca para abrir";

  const names =
    (typeof config.names === "function" ? config.names(cfg) : "") ||
    displayNames(cfg).join(" & ") ||
    "Macarena & Jorge";
  const monogram =
    (typeof config.monogram === "function" ? config.monogram(cfg) : "") ||
    initialsOf(cfg).join("&") ||
    "M&J";

  const [stage, setStage] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [sheetFull, setSheetFull] = useState(false);
  const letterRef = useRef(null);
  const timers = useRef([]);

  const later = (fn, ms) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    // Medimos el ancho del scrollbar ANTES de bloquear el scroll.
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    const prevPaddingRight = body.style.paddingRight;
    // La CSS global de la invitación reserva `scrollbar-gutter: stable`.
    // Durante el bloqueo lo neutralizamos inline: así el fallback de padding
    // compensa exactamente el hueco del scrollbar y no se reserva dos veces.
    // Se restaura en el cleanup sin cambiar la secuencia del sobre.
    const prevGutter = root.style.scrollbarGutter;
    root.style.scrollbarGutter = "auto";

    root.classList.add("de-envelope-lock");
    // Después del bloqueo comprobamos si el navegador ya reservó el hueco.
    const reserved = window.innerWidth - root.clientWidth;
    let paddingApplied = false;
    const applyPadding = (width) => {
      if (paddingApplied || width <= 0) return;
      const current = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${current + width}px`;
      paddingApplied = true;
    };
    if (scrollbarWidth > 0 && reserved === 0) {
      applyPadding(scrollbarWidth);
    }

    // El Layout de la invitación se carga de forma perezosa y puede montar
    // después del sobre. Si en ese primer frame todavía no había contenido
    // desplazable, volvemos a comprobar cuando el body cambie de tamaño.
    let raf = 0;
    const measureNativeScrollbar = () => {
      const probe = document.createElement("div");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:100px;height:100px;" +
        "overflow:scroll;visibility:hidden;pointer-events:none;";
      document.body.appendChild(probe);
      const width = probe.offsetWidth - probe.clientWidth;
      probe.remove();
      return width;
    };
    const compensateWhenContentReady = () => {
      raf = 0;
      if (paddingApplied) return;
      if (document.documentElement.scrollHeight <= window.innerHeight) return;
      const nativeScrollbar = measureNativeScrollbar();
      if (nativeScrollbar <= 0) return;
      if (body.getBoundingClientRect().width >= window.innerWidth - 0.5) {
        applyPadding(nativeScrollbar);
      }
    };
    const scheduleCheck = () => {
      if (raf) return;
      raf = requestAnimationFrame(compensateWhenContentReady);
    };
    scheduleCheck();
    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(scheduleCheck);
      resizeObserver.observe(body);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const onWheel = (event) => event.preventDefault();
    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      resizeObserver?.disconnect();
      if (raf) cancelAnimationFrame(raf);
      body.style.paddingRight = prevPaddingRight;
      root.classList.remove("de-envelope-lock");
      root.style.scrollbarGutter = prevGutter;
      window.removeEventListener("wheel", onWheel);
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [];
    };
  }, []);

  const open = () => {
    if (stage) return;
    const R = reduced ? 0.35 : 1;
    setStage(1);
    later(() => setStage(2), 700 * R);
    later(() => {
      const el = letterRef.current;
      const box = el ? el.getBoundingClientRect() : null;
      setSheet(
        box
          ? { top: box.top, left: box.left, width: box.width, height: box.height }
          : { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }
      );
      setStage(3);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setSheetFull(true))
      );
    }, 1850 * R);
    later(() => setStage(4), 2850 * R);
    later(() => {
      setStage(5);
      onOpen?.();
    }, 3800 * R);
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  };

  if (stage >= 5) return null;

  const sheetStyle = sheetFull
    ? { top: 0, left: 0, width: "100vw", height: "100vh" }
    : {
        top: sheet?.top ?? 0,
        left: sheet?.left ?? 0,
        width: sheet?.width ?? 0,
        height: sheet?.height ?? 0,
      };

  return (
    <>
      <div
        className="mjv3 mjv3-envelope-root"
        data-invitation-theme="boda_jorge_macarena"
      >
        {stage >= 3 ? (
          <div
            aria-hidden="true"
            className="mjv3-expand-sheet algodon"
            style={{
              ...sheetStyle,
              opacity: stage >= 4 ? 0 : 1,
              transition: sheetFull
                ? "top 1s cubic-bezier(.7,0,.2,1), left 1s cubic-bezier(.7,0,.2,1), width 1s cubic-bezier(.7,0,.2,1), height 1s cubic-bezier(.7,0,.2,1), opacity 0.9s ease"
                : "opacity 0.2s ease",
            }}
          />
        ) : null}

        <div
          className={`mjv3-overlay${stage >= 4 ? " mjv3-overlay--hidden" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Abrir invitación"
          onClick={open}
          onKeyDown={onKeyDown}
        >
          <div
            className="mjv3-envelope-head"
            style={{ opacity: stage >= 1 ? 0 : 1 }}
          >
            <div className="mjv3-envelope-kicker">{kicker}</div>
            {family ? (
              <div className="mjv3-envelope-family">{familyLine(family)}</div>
            ) : null}
          </div>

          <div
            className="mjv3-envelope"
            style={{
              opacity: stage >= 3 ? 0 : 1,
              transform: stage >= 3 ? "scale(1.04)" : "scale(1)",
            }}
          >
            <div className="mjv3-envelope-body algodon"
              style={{ backgroundColor: "#E6E4E0" }} />

            <div
              ref={letterRef}
              className="mjv3-envelope-letter algodon"
              style={{
                backgroundColor: "#FBFAF8",
                transform: stage >= 2 ? "translateY(-62%)" : "translateY(0%)",
              }}
            >
              <div className="mjv3-envelope-letter-kicker">{letterKicker}</div>
              <div className="mjv3-envelope-letter-names">{names}</div>
            </div>

            <div className="mjv3-envelope-pocket algodon"
              style={{ backgroundColor: "#EEEDEA" }} />
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="mjv3-envelope-pocket-line"
            >
              <path
                d="M0 100 L50 56 L100 100"
                fill="none"
                stroke="#D6D4CF"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            <div
              className="mjv3-envelope-flap"
              style={{
                zIndex: stage >= 1 ? 0 : 3,
                transform: stage >= 1 ? "rotateX(180deg)" : "rotateX(0deg)",
              }}
            >
              <div className="algodon" style={{ backgroundColor: "#E3E1DC" }} />
            </div>

            <div
              className="mjv3-seal"
              style={{
                opacity: stage >= 1 ? 0 : 1,
                transform:
                  stage >= 1
                    ? "translate(-50%,-50%) scale(1.3)"
                    : "translate(-50%,-50%) scale(1)",
              }}
            >
              <div className="mjv3-seal-disc">
                <div className="mjv3-seal-inner">
                  {monogram.split("&")[0] || "M"}
                  <span>&amp;</span>
                  {monogram.split("&")[1] || "J"}
                </div>
              </div>
            </div>
          </div>

          <div
            className="mjv3-envelope-hint"
            style={{ opacity: stage >= 1 ? 0 : 1 }}
          >
            <div className="mjv3-envelope-hint-line" />
            <div className="mjv3-envelope-hint-text">{hint}</div>
          </div>
        </div>

        <div className="mjv3-grain" aria-hidden="true" />
      </div>
    </>
  );
}
