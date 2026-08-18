import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
import { getTheme } from "./themes/index.js";
import Hero from "./sections/Hero.jsx";
import Countdown from "./sections/Countdown.jsx";
import MessageSection from "./sections/Message.jsx";
import ItinerarySection from "./sections/Itinerary.jsx";
import LocationsSection from "./sections/Locations.jsx";
import GallerySection from "./sections/Gallery.jsx";
import DressCodeSection from "./sections/DressCode.jsx";
import RsvpSection from "./sections/Rsvp.jsx";
import { Footer, InvitationLoader, InvitationNotFound } from "./sections/util.jsx";

const SECTION_MAP = {
  hero: Hero,
  countdown: Countdown,
  message: MessageSection,
  itinerary: ItinerarySection,
  locations: LocationsSection,
  gallery: GallerySection,
  dress_code: DressCodeSection,
  rsvp: RsvpSection,
};

// Clases de envoltura por sección (para no alterar el layout actual).
const SECTION_WRAP = {
  countdown: "relative z-10 -mt-12 px-4",
};

export default function InvitationPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.invitations
      .get(token)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <InvitationLoader />;
  if (error || !data) return <InvitationNotFound />;

  const { event, group, guests } = data;
  const cfg = event.invitation || {};
  const theme = getTheme(cfg.template);
  const attending = guests.filter((g) => g.registered).length;
  const declining = guests.filter((g) => g.declined).length;

  const sectionProps = {
    hero: { event, family: group.name, cfg },
    countdown: { date: event.date, time: event.time },
    message: { cfg, family: group.name },
    itinerary: { cfg },
    locations: { cfg },
    gallery: { cfg },
    dress_code: { cfg },
    rsvp: {
      token,
      family: group.name,
      guests,
      attending,
      declining,
      note: group.rsvp_note,
      theme,
      onDone: (updated) =>
        setData((prev) => ({
          ...prev,
          guests: updated.guests,
          group: { ...prev.group, rsvp_note: updated.note },
        })),
    },
  };

  return (
    <div
      data-invitation-theme={theme.id}
      style={theme.vars}
      className="min-h-screen bg-inv-bg text-inv-text font-inv-body overflow-x-clip"
    >
      {theme.sections.map((key) => {
        const Section = SECTION_MAP[key];
        if (!Section) return null;
        return (
          <div key={key} className={SECTION_WRAP[key] || ""}>
            <Section {...sectionProps[key]} />
          </div>
        );
      })}
      <Footer event={event} />
    </div>
  );
}