import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
import InvitationView from "./InvitationView.jsx";
import { InvitationLoader, InvitationNotFound } from "./shared/util.jsx";

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

  return (
    <InvitationView
      event={event}
      family={group.name}
      cfg={event.invitation || {}}
      guests={guests}
      token={token}
      rsvpNote={group.rsvp_note}
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