import { useEffect } from "react";

const TITLE = "DisplayEvent — Invitaciones digitales y organización de eventos";
const DESCRIPTION =
  "Diseña la invitación de tu XV años, boda, cumpleaños o baby shower. Comparte un enlace por grupo, confirma asistencias y acomoda mesas desde un solo panel.";

// Tipografías del lenguaje editorial de la landing (se cargan solo aquí,
// no en el resto de la aplicación).
const FONT_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,400&display=swap";

// Metadatos y fuentes de marketing mientras la landing está montada. Guarda
// el título y la descripción previos y los restaura al desmontar para no
// contaminar el resto de la aplicación (panel, auth, invitación pública).
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

  useEffect(() => {
    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = "https://fonts.gstatic.com";
    preconnect.crossOrigin = "anonymous";

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = FONT_STYLESHEET;

    document.head.append(preconnect, stylesheet);
    return () => {
      preconnect.remove();
      stylesheet.remove();
    };
  }, []);
}
