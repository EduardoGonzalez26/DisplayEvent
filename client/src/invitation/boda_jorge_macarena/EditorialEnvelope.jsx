import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Flor } from "./flora.jsx";
import { GrainOverlay } from "./Grain.jsx";
import { displayNames } from "./helpers.js";

/* ------------------------------------------------------------------
   Sobre editorial (v2) — variante exclusiva del tema
   `boda_jorge_macarena`, seleccionada con `opening.envelopeVariant:
   "editorial"` y cargada de forma perezosa por InvitationView. El sobre
   compartido (EnvelopeLoader) no cambia: los demás formatos conservan su
   comportamiento.

   Secuencia (idéntica al mock):
     sobre (reposo) → solapa abre → sello se desvanece → hoja sube →
     la hoja se expande a pantalla completa → fundido a la página.

   - Todo el arte es CSS/SVG del mock (papel crema, solapa tostada y
     sello lacre oscuro con "M&J" + flores), parametrizable con las vars
     `--inv-envelope-*` del tema.
   - Respeta `prefers-reduced-motion`: la CSS global anula las
     transiciones y los tiempos se acortan (R = 0.35), como el mock.
   - Bloquea el scroll mientras está montado usando la misma clase
     `de-envelope-lock` que el sobre compartido.
   - `opening.editorial` (opcional) permite reescribir los textos y las
     funciones de nombres/monograma desde el tema.
------------------------------------------------------------------ */

/* Parte "Macarena & Jorge" / "M&J" para colorear el "&" en itálica. */
function AmpersandText({ text, ampClassName = "" }) {
  const parts = String(text || "&").split(/\s*&\s*/);
  if (parts.length < 2) return <>{text}</>;
  return (
    <>
      {parts[0]}
      <span className={`mx-0.5 ${ampClassName}`}>&amp;</span>
      {parts.slice(1).join(" & ")}
    </>
  );
}

export default function EditorialEnvelope({ family, cfg = {}, opening, onOpen }) {
  const reduced = useReducedMotion();
  const config = opening?.editorial || {};
  const kicker = config.kicker || "Una invitación para";
  const letterKicker = config.letterKicker || "Nos casamos";
  const hint = config.hint || "Toca para abrir";
  const familyPrefix = config.familyPrefix || "";

  const names =
    (typeof config.names === "function" ? config.names(cfg) : "") ||
    displayNames(cfg).join(" & ") ||
    "&";
  const monogram =
    (typeof config.monogram === "function" ? config.monogram(cfg) : "") || "&";

  // 0 cerrado · 1 solapa abierta · 2 hoja fuera · 3 hoja a pantalla ·
  // 4 fundido a la página · 5 desmontar.
  const [stage, setStage] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [sheetFull, setSheetFull] = useState(false);
  const letterRef = useRef(null);
  const timers = useRef([]);

  const later = (fn, ms) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /* Bloqueo del scroll (misma mecánica que EnvelopeLoader): overflow
     hidden + compensación de scrollbar + rueda cancelada + scroll a 0. */
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const scrollbarWidth = window.innerWidth - root.clientWidth;
    const prevPaddingRight = body.style.paddingRight;

    root.classList.add("de-envelope-lock");
    if (scrollbarWidth > 0) {
      const current = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${current + scrollbarWidth}px`;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    const onWheel = (e) => e.preventDefault();
    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      root.classList.remove("de-envelope-lock");
      body.style.paddingRight = prevPaddingRight;
      window.removeEventListener("wheel", onWheel);
      timers.current.forEach((t) => clearTimeout(t));
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
      const b = el ? el.getBoundingClientRect() : null;
      setSheet(
        b
          ? { top: b.top, left: b.left, width: b.width, height: b.height }
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

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
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
      {/* Hoja que se expande a pantalla completa */}
      {stage >= 3 && (
        <div
          aria-hidden="true"
          className="pointer-events-none"
          style={{
            position: "fixed",
            zIndex: 101,
            background: "var(--inv-envelope-card, #FFFDF9)",
            opacity: stage >= 4 ? 0 : 1,
            transition: sheetFull
              ? "top 1s cubic-bezier(.7,0,.2,1), left 1s cubic-bezier(.7,0,.2,1), width 1s cubic-bezier(.7,0,.2,1), height 1s cubic-bezier(.7,0,.2,1), opacity 0.9s ease"
              : "opacity 0.2s ease",
            ...sheetStyle,
          }}
        />
      )}

      <div
        className="envelope-focus fixed inset-0 z-[100] flex cursor-pointer select-none flex-col items-center justify-center gap-10 p-6"
        style={{
          background: "var(--inv-envelope-backdrop, #F6F2EB)",
          opacity: stage >= 4 ? 0 : 1,
          pointerEvents: stage >= 4 ? "none" : "auto",
          transition: "opacity 0.9s ease",
        }}
        role="button"
        tabIndex={0}
        aria-label="Abrir invitación"
        onClick={open}
        onKeyDown={onKeyDown}
      >
        {/* Encabezado: "Una invitación para la Familia X" */}
        <div
          className="flex flex-col items-center gap-2.5 text-center"
          style={{ opacity: stage >= 1 ? 0 : 1, transition: "opacity 0.6s ease" }}
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.34em] text-[var(--inv-text-muted)]">
            {kicker}
          </div>
          {family && (
            <div className="font-inv-display text-[30px] italic text-[var(--inv-text)]">
              {[familyPrefix, family].filter(Boolean).join(" ")}
            </div>
          )}
        </div>

        {/* Sobre */}
        <div
          className="relative aspect-[3/2] w-[min(84vw,440px)]"
          style={{
            perspective: 1100,
            opacity: stage >= 3 ? 0 : 1,
            transform: stage >= 3 ? "scale(1.04)" : "scale(1)",
            transition: "opacity 0.7s ease, transform 0.9s ease",
          }}
        >
          {/* Cuerpo trasero */}
          <div
            className="absolute inset-0 rounded-[3px]"
            style={{
              background: "var(--inv-envelope-body, #ECE4D6)",
              boxShadow:
                "var(--inv-envelope-shadow, 0 30px 50px -28px rgba(50,35,20,0.35), 0 2px 6px rgba(50,35,20,0.08))",
            }}
          />

          {/* Hoja interior (sube al abrir) */}
          <div
            ref={letterRef}
            className="absolute left-[5%] right-[5%] top-[5%] z-[1] flex h-[90%] flex-col items-center justify-start gap-1.5 rounded-[2px] pt-[9%]"
            style={{
              background: "var(--inv-envelope-card, #FFFDF9)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              transform: stage >= 2 ? "translateY(-62%)" : "translateY(0%)",
              transition: "transform 1.1s cubic-bezier(.3,.7,.2,1)",
            }}
          >
            <div className="text-[9px] font-medium uppercase tracking-[0.34em] text-[var(--inv-text-muted)]">
              {letterKicker}
            </div>
            <div className="font-inv-display text-[30px] font-[300] leading-[1.1] text-[var(--inv-text)]">
              <AmpersandText text={names} ampClassName="mx-2 italic" />
            </div>
            <span className="mt-1.5 inline-flex h-[22px] w-[22px]">
              <Flor kind="dalia" />
            </span>
          </div>

          {/* Bolsillo frontal con su filete diagonal */}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-[2]"
            style={{
              background: "var(--inv-envelope-pocket-l, #F3ECE1)",
              clipPath: "polygon(0 0, 50% 56%, 100% 0, 100% 100%, 0 100%)",
              borderRadius: 3,
            }}
          />
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
          >
            <path
              d="M0 100 L50 56 L100 100"
              fill="none"
              stroke="var(--inv-envelope-border, #DCD2C2)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Solapa superior */}
          <div
            aria-hidden="true"
            className="absolute left-0 top-0 h-[60%] w-full"
            style={{
              zIndex: stage >= 1 ? 0 : 3,
              transformOrigin: "50% 0",
              transform: stage >= 1 ? "rotateX(180deg)" : "rotateX(0deg)",
              transition: "transform 0.9s cubic-bezier(.5,0,.2,1)",
              filter: "drop-shadow(0 3px 3px rgba(60,40,20,0.14))",
            }}
          >
            <div
              className="h-full w-full rounded-t-[3px]"
              style={{
                background: "var(--inv-envelope-flap, #EAE1D2)",
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              }}
            />
          </div>

          {/* Sello de lacre oscuro con "M&J" y flores */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-[60%] z-[4] h-[72px] w-[72px]"
            style={{
              transform:
                stage >= 1
                  ? "translate(-50%,-50%) scale(1.3)"
                  : "translate(-50%,-50%) scale(1)",
              opacity: stage >= 1 ? 0 : 1,
              transition: "transform 0.6s ease, opacity 0.5s ease",
            }}
          >
            <div
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 34% 30%, var(--inv-envelope-seal-a, #55504B), var(--inv-envelope-seal-b, #262422) 62%, var(--inv-envelope-seal-c, #1A1817) 100%)",
                boxShadow:
                  "var(--inv-envelope-seal-shadow, 0 4px 10px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.12))",
              }}
            >
              <div
                className="flex h-[56px] w-[56px] items-center justify-center rounded-full border border-[rgba(250,247,242,0.22)] font-inv-display text-[21px] font-medium"
                style={{ color: "var(--inv-envelope-ink, #EFE8DC)" }}
              >
                <AmpersandText text={monogram} ampClassName="text-[15px] italic" />
              </div>
            </div>
            <Flor
              kind="bugambilia"
              className="absolute"
              style={{ right: -16, bottom: -6, width: 26, height: 26 }}
            />
            <Flor
              kind="dalia"
              className="absolute"
              style={{ right: -4, bottom: -16, width: 20, height: 20 }}
            />
          </div>
        </div>

        {/* Pista inferior */}
        <div
          className="flex flex-col items-center gap-3"
          style={{ opacity: stage >= 1 ? 0 : 1, transition: "opacity 0.5s ease" }}
        >
          <div aria-hidden="true" className="h-7 w-px bg-[#B9B0A2]" />
          <div className="text-xs font-medium uppercase tracking-[0.34em] text-[var(--inv-primary)]">
            {hint}
          </div>
        </div>
      </div>

      {/* Textura de papel del diseño (también sobre el sobre) */}
      <GrainOverlay />
    </>
  );
}
