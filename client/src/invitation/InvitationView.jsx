import { Suspense, useState } from "react";
import { getTheme, getThemeLayout } from "./themes/index.js";
import { motion } from "motion/react";
import { InvitationLoader } from "./shared/util.jsx";
import EnvelopeLoader from "./envelope/EnvelopeLoader.jsx";

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
  onRsvpDone,
}) {
  const theme = getTheme(cfg.template);
  const Layout = getThemeLayout(cfg.template);

  const attending = guests.filter((g) => g.registered).length;
  const declining = guests.filter((g) => g.declined).length;

  // Experiencia de apertura (sobre digital) configurada por plantilla.
  const opening = theme.opening;
  const [envelopeOpen, setEnvelopeOpen] = useState(false);
  const showEnvelope = !preview && !!opening?.envelope && !envelopeOpen;
  // Marca el momento en que la invitación "se abre" para disparar las
  // transiciones de entrada (monograma, seda, perlas).
  const reveal = preview || !opening?.envelope || envelopeOpen;

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
            onDone: onRsvpDone,
          }}
        />
      </Suspense>
      {showEnvelope && (
        <EnvelopeLoader
          monogram={opening?.cardText?.(cfg) || "&"}
          seal={opening?.sealText?.(cfg) || "&"}
          onOpen={() => setEnvelopeOpen(true)}
        />
      )}
    </motion.div>
  );
}