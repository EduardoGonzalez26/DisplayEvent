import Rsvp from "../shared/Rsvp.jsx";
import Itinerary from "../shared/Itinerary.jsx";
import Locations from "../shared/Locations.jsx";
import Footer from "../shared/Footer.jsx";
import Message from "../shared/Message.jsx";
import Gallery from "../shared/Gallery.jsx";
import DressCode from "../shared/DressCode.jsx";
import RegistryNote from "../shared/RegistryNote.jsx";
import Padrinos from "../shared/Padrinos.jsx";
import Hero from "./Hero.jsx";

/* ------------------------------------------------------------------
   XV de Alice — monograma madreperla, seda lavanda, perlas 3D, padrinos
   y mesa de regalos. Misma composición que "xv"; cambia la paleta.
------------------------------------------------------------------ */
export default function AliceXvLayout({ event, family, cfg, theme, rsvp, reveal = true }) {
  return (
    <div>
      <Hero event={event} family={family} cfg={cfg} theme={theme} reveal={reveal} />
      <Message cfg={cfg} family={family} theme={theme} />
      <Itinerary cfg={cfg} theme={theme} />
      <Locations cfg={cfg} theme={theme} />
      <Gallery cfg={cfg} theme={theme} />
      <DressCode cfg={cfg} theme={theme} />
      <RegistryNote cfg={cfg} theme={theme} />
      <Padrinos cfg={cfg} theme={theme} />
      <Rsvp {...rsvp} />
      <Footer event={event} theme={theme} />
    </div>
  );
}
