import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { getTheme, getThemeLayout } from "./themes/index.js";
import { motion } from "motion/react";
import { InvitationLoader } from "./shared/util.jsx";
import EnvelopeLoader from "./envelope/EnvelopeLoader.jsx";

/* ------------------------------------------------------------------
   Variantes de sobre por tema. `opening.envelopeVariant` selecciona un
   componente dedicado (carga perezosa: no se descarga si el tema no lo
   usa). Los temas sin variante conservan el sobre compartido
   `EnvelopeLoader` sin ningún cambio de comportamiento.
------------------------------------------------------------------ */
const ENVELOPE_VARIANTS = {
  editorial: lazy(() =>
    import("./boda_jorge_macarena/EditorialEnvelope.jsx")
  ),
};

/* ------------------------------------------------------------------
   Renderiza la invitación con un tema + config. Cada plantilla define
   su propio Layout (composición de secciones); las secciones comunes
   (Countdown, Itinerary, Locations, Rsvp, Footer) viven en shared/.
   Lo usa la landing pública (InvitationPage) y la vista previa del
   editor con datos aún sin guardar.
------------------------------------------------------------------ */
export default function InvitationView({
  event,
  family,
  cfg,
  guests = [],
  token,
  rsvpNote,
  preview = false,
  hideBrand = false,
  onRsvpDone,
  publishableKey,
  ageRanges = [],
  // `payment_methods` de la respuesta pública: { card: { mxn, eur } }.
  // `null` (respuestas viejas o vista previa del editor) = disponible.
  paymentMethods = null,
}) {
  const theme = getTheme(cfg.template);
  const Layout = useMemo(
    () => getThemeLayout(cfg.template),
    [cfg.template]
  );

  const attending = guests.filter((g) => g.registered).length;
  const declining = guests.filter((g) => g.declined).length;

  // Experiencia de apertura (sobre digital) configurada por plantilla.
  const opening = theme.opening;
  // Deep link a RSVP: #confirmar abre la invitación sin sobre para que la
  // sección de confirmación quede visible desde el primer render.
  const [envelopeOpen, setEnvelopeOpen] = useState(
    () => typeof window !== "undefined" && window.location.hash === "#confirmar"
  );
  const [envelopeRevealing, setEnvelopeRevealing] = useState(false);
  const showEnvelope = !preview && !!opening?.envelope && !envelopeOpen;
  // Marca el momento en que la invitación "se abre" para disparar las
  // transiciones de entrada (monograma, seda, perlas). `envelopeRevealing`
  // arranca en stage 4, mientras el overlay aún se desvanece.
  const reveal =
    preview || !opening?.envelope || envelopeOpen || envelopeRevealing;
  // Sobre del tema (variante dedicada) o el sobre compartido.
  const Envelope =
    (opening?.envelopeVariant && ENVELOPE_VARIANTS[opening.envelopeVariant]) ||
    EnvelopeLoader;

  // Deep link genérico #confirmar para las plantillas con RSVP compartido.
  // Se reintenta el scroll porque el layout puede montarse después.
  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#confirmar") {
      return undefined;
    }
    const scrollToConfirm = () => {
      const target = document.getElementById("confirmar");
      if (target) target.scrollIntoView({ block: "start", behavior: "auto" });
    };
    const timers = [100, 400, 900].map((delay) =>
      window.setTimeout(scrollToConfirm, delay)
    );
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <motion.div
      data-invitation-theme={theme.id}
      style={theme.vars}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-inv-bg text-inv-text font-inv-body overflow-x-clip"
    >
      <Suspense fallback={<InvitationLoader />}>
        <Layout
          event={event}
          family={family}
          cfg={cfg}
          theme={theme}
          reveal={reveal}
          token={token}
          hideBrand={hideBrand}
          publishableKey={publishableKey}
          paymentMethods={paymentMethods}
          rsvp={{
            token,
            family,
            guests,
            attending,
            declining,
            note: rsvpNote,
            theme,
            cfg,
            preview,
            ageRanges,
            onDone: onRsvpDone,
          }}
        />
      </Suspense>
      {showEnvelope && (
        <Suspense fallback={null}>
          <Envelope
            family={family}
            cfg={cfg}
            opening={opening}
            monogram={opening?.cardText?.(cfg) || "&"}
            seal={opening?.sealText?.(cfg) || "&"}
            onOpen={() => setEnvelopeOpen(true)}
            onReveal={() => setEnvelopeRevealing(true)}
          />
        </Suspense>
      )}
    </motion.div>
  );
}