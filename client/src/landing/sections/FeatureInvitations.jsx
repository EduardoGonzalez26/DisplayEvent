import FeaturePlate from "../components/FeaturePlate.jsx";
import InvitationCardMock from "../components/InvitationCardMock.jsx";

const BULLETS = [
  "Sobre digital de apertura",
  "Cuenta regresiva e itinerario",
  "Ubicaciones con Google Maps y Waze",
  "Galería de fotos y dress code",
  "Mensaje de los anfitriones",
  "Confirmación de asistencia",
];

export default function FeatureInvitations() {
  return (
    <FeaturePlate
      id="invitaciones"
      index="01"
      label="Invitaciones"
      title="Seis diseños. Uno para tu celebración."
      lead="Elige el formato que hable de tu fiesta y personalízalo con tus datos: sobre digital, cuenta regresiva, itinerario, ubicaciones, galería y una portada que se siente hecha a mano."
      bullets={BULLETS}
      caption="Fig. 02 — Portada de una invitación de XV años."
    >
      <InvitationCardMock />
    </FeaturePlate>
  );
}
