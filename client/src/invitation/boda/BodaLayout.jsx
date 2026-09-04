import Countdown from "../shared/Countdown.jsx";
import Rsvp from "../shared/Rsvp.jsx";
import Itinerary from "../shared/Itinerary.jsx";
import Locations from "../shared/Locations.jsx";
import Footer from "../shared/Footer.jsx";
import Message from "../shared/Message.jsx";
import Gallery from "../shared/Gallery.jsx";
import DressCode from "../shared/DressCode.jsx";
import RegistryNote from "../shared/RegistryNote.jsx";
import Hero from "./Hero.jsx";

/* ------------------------------------------------------------------
   Boda — flujo propio: sobre de apertura + hero 3D + scrollytelling.
   Comparte Countdown, Itinerary, Locations, Rsvp y Footer.
------------------------------------------------------------------ */
export default function BodaLayout({ event, family, cfg, theme, rsvp }) {
  return (
    <div>
      <Hero event={event} family={family} cfg={cfg} />
      <div className="relative z-10 -mt-12 px-4">
        <Countdown date={event.date} time={event.time} theme={theme} />
      </div>
      <Message cfg={cfg} family={family} theme={theme} />
      <Itinerary cfg={cfg} theme={theme} />
      <Locations cfg={cfg} theme={theme} />
      <Gallery cfg={cfg} theme={theme} />
      <DressCode cfg={cfg} theme={theme} />
      <RegistryNote cfg={cfg} theme={theme} />
      <Rsvp {...rsvp} />
      <Footer event={event} theme={theme} />
    </div>
  );
}