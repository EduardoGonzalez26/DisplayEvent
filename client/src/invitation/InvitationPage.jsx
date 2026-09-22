import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
import { isCustomDomainActive } from "../lib/publicDomain.js";
import InvitationView from "./InvitationView.jsx";
import { InvitationLoader, InvitationNotFound } from "./shared/util.jsx";

export default function InvitationPage() {
  // Funciona con ambas rutas: /invitacion/:token y /invitacion/:slug/:token.
  // En las dos, el token llega por params y es lo único que resuelve la invitación.
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

  useEffect(() => {
    document.documentElement.classList.add("de-invitation");
    return () => document.documentElement.classList.remove("de-invitation");
  }, []);

  // White-label: si el dominio propio del evento coincide con el host actual
  // (tolerando `www.` en cualquiera de los dos), se oculta la marca
  // "DisplayEvent" en el footer y se añade `noindex` a la página.
  const hideBrand = isCustomDomainActive(data?.public_config?.custom_domain);

  useEffect(() => {
    if (!hideBrand) return undefined;
    const meta = document.createElement("meta");
    meta.setAttribute("name", "robots");
    meta.setAttribute("content", "noindex");
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [hideBrand]);

  if (loading) return <InvitationLoader />;
  if (error || !data) return <InvitationNotFound />;

  const { event, group, guests, public_config } = data;

  return (
    <InvitationView
      event={event}
      family={group.name}
      cfg={event.invitation || {}}
      guests={guests}
      token={token}
      hideBrand={hideBrand}
      rsvpNote={group.rsvp_note}
      publishableKey={public_config?.stripe_publishable_key || null}
      onRsvpDone={(updated) =>
        setData((prev) => ({
          ...prev,
          guests: updated.guests,
          group: { ...prev.group, rsvp_note: updated.note },
        }))
      }
    />
  );
}