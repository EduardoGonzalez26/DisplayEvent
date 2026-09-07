import Rsvp from "../shared/Rsvp.jsx";
import Itinerary from "../shared/Itinerary.jsx";
import Locations from "../shared/Locations.jsx";
import Footer from "../shared/Footer.jsx";
import Message from "../shared/Message.jsx";
import Gallery from "../shared/Gallery.jsx";
import DressCode from "../shared/DressCode.jsx";
import RegistryNote from "../shared/RegistryNote.jsx";
import Gifts from "../shared/Gifts.jsx";
import Padrinos from "../shared/Padrinos.jsx";
import Hero from "./Hero.jsx";

/* ------------------------------------------------------------------
   XV años — monograma madreperla, seda, perlas 3D, padrinos y mesa de
   regalos. El contador de cristal vive dentro del hero.
------------------------------------------------------------------ */
export default function XvLayout({ event, family, cfg, theme, rsvp, reveal = true, token, publishableKey }) {
  return (
    <div>
      <Hero event={event} family={family} cfg={cfg} theme={theme} reveal={reveal} />
      <Message cfg={cfg} family={family} theme={theme} />
      <Itinerary cfg={cfg} theme={theme} />
      <Locations cfg={cfg} theme={theme} />
      <Gallery cfg={cfg} theme={theme} />
      <DressCode cfg={cfg} theme={theme} />
      <RegistryNote cfg={cfg} theme={theme} />
      <Gifts cfg={cfg} theme={theme} token={token} publishableKey={publishableKey} />
      <Padrinos cfg={cfg} theme={theme} />
      <Rsvp {...rsvp} />
      <Footer event={event} theme={theme} />
    </div>
  );
}