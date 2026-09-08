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
import Rsvp from "../shared/Rsvp.jsx";

/* ------------------------------------------------------------------
   Boda de Jorge & Macarena — flujo claro botánico (marfil + acentos
   vibrantes). Todas las secciones de presentación son locales (Hero,
   Countdown, Message, Itinerary, Locations, Gallery, DressCode,
   RegistryNote, Footer, Gifts); solo Rsvp sigue siendo compartido
   (lógica Stripe/API intacta).

   Composición de scroll "sticky + tapado": la portada queda fija arriba
   (contenedor sticky z-0) mientras el contenido posterior (z-10, fondo
   marfil sólido) sube y la va cubriendo al hacer scroll.
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
}) {
  // Evita dejar un hueco con padding superior si el contador no va a
  // renderizar (sin fecha o fecha inválida): en ese caso la primera
  // sección arranca pegada al contenido que tapa la portada.
  const hasCountdown = (() => {
    if (!event.date) return false;
    const ts = new Date(`${event.date}T${event.time || "00:00:00"}`).getTime();
    return !Number.isNaN(ts);
  })();

  return (
    <div>
      <div className="sticky top-0 z-0">
        <Hero event={event} family={family} cfg={cfg} reveal={reveal} />
      </div>
      <div className="relative z-10 bg-inv-bg">
        <div className={hasCountdown ? "px-4 pt-12 md:pt-16" : ""}>
          <Countdown date={event.date} time={event.time} theme={theme} />
        </div>
        <Message cfg={cfg} family={family} theme={theme} />
        <Itinerary cfg={cfg} theme={theme} />
        <Locations cfg={cfg} theme={theme} />
        <Gallery cfg={cfg} theme={theme} />
        <DressCode cfg={cfg} theme={theme} />
        <RegistryNote cfg={cfg} theme={theme} />
        <Gifts cfg={cfg} theme={theme} token={token} publishableKey={publishableKey} />
        <Rsvp {...rsvp} />
        <Footer event={event} theme={theme} cfg={cfg} />
      </div>
    </div>
  );
}
