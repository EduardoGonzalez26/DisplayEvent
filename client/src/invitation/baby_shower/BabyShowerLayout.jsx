import Countdown from "../shared/Countdown.jsx";
import Rsvp from "../shared/Rsvp.jsx";
import Itinerary from "../shared/Itinerary.jsx";
import Locations from "../shared/Locations.jsx";
import Footer from "../shared/Footer.jsx";
import Hero from "./Hero.jsx";
import Message from "./Message.jsx";
import Gallery from "./Gallery.jsx";
import DressCode from "./DressCode.jsx";
import RegistryNote from "./RegistryNote.jsx";

/* ------------------------------------------------------------------
   Baby shower — flujo con presentación de papás y nota de regalos.
------------------------------------------------------------------ */
export default function BabyShowerLayout({ event, family, cfg, theme, rsvp }) {
  return (
    <div>
      <Hero event={event} family={family} cfg={cfg} theme={theme} />
      <div className="relative z-10 -mt-12 px-4">
        <Countdown date={event.date} time={event.time} />
      </div>
      <Message cfg={cfg} family={family} theme={theme} />
      <Itinerary cfg={cfg} />
      <Locations cfg={cfg} />
      <Gallery cfg={cfg} />
      <DressCode cfg={cfg} />
      <RegistryNote cfg={cfg} theme={theme} />
      <Rsvp {...rsvp} />
      <Footer event={event} />
    </div>
  );
}