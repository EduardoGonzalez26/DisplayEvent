import { useEffect } from "react";

const TITLE = "DisplayEvent — Invitaciones digitales y organizador de eventos";
const DESCRIPTION =
  "Invitaciones digitales para XV años, bodas, cumpleaños y baby showers. Confirma asistencias por grupo, acomoda mesas y recibe regalos desde un solo panel.";

// Metadatos de marketing mientras la landing está montada. Guarda el título
// y la descripción previos y los restaura al desmontar para no contaminar el
// resto de la aplicación (panel, auth, invitación pública).
export default function useLandingMeta() {
  useEffect(() => {
    const prevTitle = document.title;
    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    const prevDescription = meta ? meta.getAttribute("content") : null;

    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }

    document.title = TITLE;
    meta.setAttribute("content", DESCRIPTION);

    return () => {
      document.title = prevTitle;
      if (created) {
        meta.remove();
      } else if (prevDescription !== null) {
        meta.setAttribute("content", prevDescription);
      }
    };
  }, []);
}
