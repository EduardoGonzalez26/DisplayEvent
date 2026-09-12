import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE } from "../../invitation/motion.jsx";

const FAQS = [
  {
    q: "¿Los invitados necesitan crear una cuenta?",
    a: "No: cada grupo recibe un enlace que abre la invitación directo.",
  },
  {
    q: "¿Puedo personalizar la invitación?",
    a: "Sí: 6 formatos con portada, mensaje, itinerario, ubicaciones, dress code, galería, RSVP y mesa de regalos.",
  },
  {
    q: "¿Puedo editar después de compartir?",
    a: "Sí; los enlaces siguen activos (y puedes regenerar el enlace de un grupo para revocarlo).",
  },
  {
    q: "¿Cómo funciona el acomodo de mesas?",
    a: "Arrastra invitados confirmados a las mesas; el sistema valida la capacidad; hay mesas de niños y exportación para imprimir.",
  },
  {
    q: "¿Cómo reciben los regalos?",
    a: "Depósito/transferencia bancaria o pago con tarjeta; montos en MXN o EUR.",
  },
  {
    q: "¿Puedo reutilizar un diseño en otro evento?",
    a: "Sí, con plantillas privadas de tu cuenta.",
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(0);
  const reduced = useReducedMotion();

  return (
    <section id="preguntas" className="de-faq">
      <div className="de-faq__inner">
        <div className="de-faq__head">
          <p className="de-eyebrow">Preguntas</p>
          <h2 className="de-section-title">Preguntas frecuentes</h2>
        </div>

        <div className="de-faq__list">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            const panelId = `de-faq-panel-${i}`;
            const buttonId = `de-faq-button-${i}`;

            return (
              <div key={item.q} className={`de-faq__item${isOpen ? " is-open" : ""}`}>
                <h3 className="de-faq__q">
                  <button
                    type="button"
                    id={buttonId}
                    className="de-faq__btn"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? -1 : i)}
                  >
                    <span>{item.q}</span>
                    <svg
                      className="de-faq__icon"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M10 3v14M3 10h14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="de-faq__panel"
                      initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                      exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={reduced ? { duration: 0 } : { duration: 0.32, ease: EASE }}
                    >
                      <p className="de-faq__a">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
