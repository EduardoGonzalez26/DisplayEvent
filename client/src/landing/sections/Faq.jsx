import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE } from "../../invitation/motion.jsx";

const FAQS = [
  {
    q: "¿Mis invitados necesitan crear una cuenta?",
    a: "No. Cada grupo recibe un enlace que abre la invitación directo.",
  },
  {
    q: "¿Puedo personalizar la invitación?",
    a: "Sí: formato, portada, mensaje, itinerario, ubicaciones, dress code, galería, confirmación y mesa de regalos.",
  },
  {
    q: "¿Puedo editar después de compartir?",
    a: "Sí. Los enlaces siguen activos y puedes regenerar el de un grupo para revocarlo.",
  },
  {
    q: "¿Cómo funciona el acomodo de mesas?",
    a: "Arrastra invitados confirmados a las mesas; el sistema valida la capacidad. Hay mesas de niños y exportación para imprimir.",
  },
  {
    q: "¿Cómo llegan los regalos?",
    a: "Por depósito o transferencia bancaria; el pago con tarjeta se activa desde tu cuenta. Montos en pesos o euros.",
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
          <h2 className="de-section-title">Lo que nos preguntan seguido</h2>
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
                    <span className="de-faq__num" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
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
