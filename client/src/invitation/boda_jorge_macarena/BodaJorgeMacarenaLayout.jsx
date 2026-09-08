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
   (lógica Stripe/API intacta). El contador flota sobre el cierre del
   hero.
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
  // Evita el solapamiento negativo si el contador no va a renderizar
  // (sin fecha o fecha inválida): las secciones siguientes no se montan
  // sobre la portada.
  const hasCountdown = (() => {
    if (!event.date) return false;
    const ts = new Date(`${event.date}T${event.time || "00:00:00"}`).getTime();
    return !Number.isNaN(ts);
  })();

  return (
    <div>
      <Hero event={event} family={family} cfg={cfg} reveal={reveal} />
      <div className={`relative z-10 ${hasCountdown ? "-mt-14 px-4 md:-mt-20" : ""}`}>
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
  );
}
