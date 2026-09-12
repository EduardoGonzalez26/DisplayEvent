import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { EASE } from "../../invitation/motion.jsx";
import { useAuth } from "../../auth.jsx";

export default function Hero() {
  const { user, loading } = useAuth();
  const reduced = useReducedMotion();

  return (
    <section id="inicio" className="de-hero">
      <span className="de-grain" aria-hidden="true" />
      <div className="de-hero__inner">
        <div className="de-hero__copy">
          <p className="de-eyebrow">Invitaciones digitales y organización de eventos</p>
          <h1 className="de-hero__title">
            Organiza tu evento. <em>Enamora con tu invitación.</em>
          </h1>
          <p className="de-hero__subtitle">
            Invitaciones para XV años, bodas, cumpleaños y baby showers. Confirma asistencias por
            grupo, acomoda mesas y recibe regalos desde un solo panel.
          </p>
          <div className="de-hero__ctas">
            {loading ? (
              <span className="de-cta-placeholder" aria-hidden="true" />
            ) : user ? (
              <Link to="/eventos" className="de-btn de-btn--primary de-btn--lg">
                Ir a mis eventos
              </Link>
            ) : (
              <Link to="/registro" className="de-btn de-btn--primary de-btn--lg">
                Crear mi evento
              </Link>
            )}
            <a href="#formatos" className="de-btn de-btn--ghost de-btn--lg">
              Ver formatos
            </a>
          </div>
        </div>

        <div
          className="de-hero__visual"
          role="img"
          aria-label="Ilustración de una invitación digital que sale de un sobre abierto"
        >
          <motion.div
            className="de-envelope"
            animate={reduced ? undefined : { y: [0, -9, 0] }}
            transition={reduced ? undefined : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="de-envelope__body" aria-hidden="true" />
            <motion.span
              className="de-envelope__card"
              aria-hidden="true"
              initial={reduced ? false : { y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, ease: EASE, delay: 0.3 }}
            >
              <span className="de-envelope__monogram">XV</span>
              <span className="de-envelope__title">Celebración</span>
              <span className="de-envelope__date">12 · Septiembre · 2026</span>
            </motion.span>
            <span className="de-envelope__pocket" aria-hidden="true" />
            <motion.span
              className="de-envelope__flap"
              aria-hidden="true"
              initial={reduced ? false : { rotateX: 0 }}
              animate={{ rotateX: reduced ? 0 : -60 }}
              transition={{ duration: 1.2, ease: EASE, delay: 0.15 }}
            />
          </motion.div>

          <span className="de-hero__chip de-hero__chip--a" aria-hidden="true">
            RSVP por pase
          </span>
          <span className="de-hero__chip de-hero__chip--b" aria-hidden="true">
            Mesas con capacidad
          </span>
        </div>
      </div>
    </section>
  );
}
