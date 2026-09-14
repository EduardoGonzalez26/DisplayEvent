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
          <p className="de-hero__dateline">XV años · Bodas · Cumpleaños · Baby showers</p>
          <h1 className="de-hero__title">
            <span className="de-hero__title-line">
              Una invitación que <em>se guarda</em>.
            </span>
            <span className="de-hero__title-line">
              Una lista que por fin <em>cuadra</em>.
            </span>
          </h1>
          <p className="de-hero__lead">
            Diseña y comparte la invitación de tu celebración, reúne las confirmaciones por grupo y
            acomoda cada mesa sin hojas de cálculo.
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
              Ver los formatos
            </a>
          </div>
        </div>

        <figure className="de-hero__plate">
          <div className="de-plate">
            <div className="de-plate__frame">
              <div
                className="de-envelope"
                role="img"
                aria-label="Invitación digital que sale de un sobre abierto"
              >
                <span className="de-envelope__body" aria-hidden="true" />
                <motion.span
                  className="de-envelope__card"
                  aria-hidden="true"
                  initial={reduced ? false : { y: 26, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.25 }}
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
                  whileInView={{ rotateX: reduced ? 0 : -58 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 1.1, ease: EASE, delay: 0.1 }}
                />
              </div>
            </div>
            <figcaption className="de-plate__caption">
              Fig. 01 — Invitación con sobre de apertura, cuenta regresiva y RSVP.
            </figcaption>
          </div>
        </figure>

        <ul className="de-hero__facts">
          <li className="de-hero__fact">Invitados sin cuenta</li>
          <li className="de-hero__fact">Un enlace por grupo</li>
          <li className="de-hero__fact">Capacidad validada en mesas</li>
        </ul>
      </div>
    </section>
  );
}
