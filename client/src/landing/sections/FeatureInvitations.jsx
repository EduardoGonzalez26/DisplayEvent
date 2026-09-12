import { Reveal } from "../../invitation/motion.jsx";
import InvitationCardMock from "../components/InvitationCardMock.jsx";

const BULLETS = [
  "6 diseños",
  "Sobre digital",
  "Cuenta regresiva",
  "Itinerario",
  "Ubicaciones con mapa y botones Google Maps/Waze",
  "Galería",
  "Dress code",
  "RSVP",
];

export default function FeatureInvitations() {
  return (
    <section className="de-feature">
      <div className="de-feature__inner">
        <Reveal className="de-feature__copy">
          <p className="de-eyebrow">Invitaciones</p>
          <h2 className="de-feature__title">Una invitación que se siente hecha a mano</h2>
          <p className="de-feature__text">
            Elige entre 6 diseños, abre con sobre digital y personaliza cada detalle: cuenta
            regresiva, itinerario, ubicaciones con mapa y botones para Google Maps y Waze, galería,
            dress code y confirmación de asistencia.
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
            <InvitationCardMock />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
