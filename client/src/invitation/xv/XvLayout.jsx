import Rsvp from "../shared/Rsvp.jsx";
import Itinerary from "../shared/Itinerary.jsx";
import Locations from "../shared/Locations.jsx";
import Footer from "../shared/Footer.jsx";
import Hero from "./Hero.jsx";
import Message from "./Message.jsx";
import Gallery from "./Gallery.jsx";
import DressCode from "./DressCode.jsx";
import RegistryNote from "./RegistryNote.jsx";
import Padrinos from "./Padrinos.jsx";

/* ------------------------------------------------------------------
   XV años — monograma madreperla, seda, perlas 3D, padrinos y mesa de
   regalos. El contador de cristal vive dentro del hero.
------------------------------------------------------------------ */
export default function XvLayout({ event, family, cfg, theme, rsvp, reveal = true }) {
  return (
    <div>
      <Hero event={event} family={family} cfg={cfg} theme={theme} reveal={reveal} />
      <Message cfg={cfg} family={family} theme={theme} />
      <Itinerary cfg={cfg} />
      <Locations cfg={cfg} />
      <Gallery cfg={cfg} />
      <DressCode cfg={cfg} />
      <RegistryNote cfg={cfg} theme={theme} />
      <Padrinos cfg={cfg} theme={theme} />
      <Rsvp {...rsvp} />
      <Footer event={event} />
    </div>
  );
}