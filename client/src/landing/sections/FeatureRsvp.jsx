import { Reveal } from "../../invitation/motion.jsx";
import RsvpCardMock from "../components/RsvpCardMock.jsx";

const BULLETS = [
  "Un enlace único por grupo",
  "Líder del grupo",
  "Confirmación por pase",
  "Restricciones alimenticias",
  "Periqueras",
  "Conteo en vivo",
  "Sin cuenta para invitados",
];

export default function FeatureRsvp() {
  return (
    <section className="de-feature de-feature--alt de-feature--flip">
      <div className="de-feature__inner">
        <Reveal className="de-feature__copy">
          <p className="de-eyebrow">Grupos y RSVP</p>
          <h2 className="de-feature__title">Cada grupo, su propio enlace</h2>
          <p className="de-feature__text">
            Comparte un enlace único por grupo: tus invitados no necesitan crear cuenta. El líder
            confirma por pase, registra restricciones alimenticias y periqueras, y tú ves el conteo
            en vivo.
          </p>
          <ul className="de-feature__list">
            {BULLETS.map((bullet) => (
              <li key={bullet} className="de-feature__item">
                {bullet}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="de-feature__media" delay={0.1}>
          <div className="de-mock-wrap">
            <RsvpCardMock />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
