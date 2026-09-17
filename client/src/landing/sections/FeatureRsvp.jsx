import FeaturePlate from "../components/FeaturePlate.jsx";
import RsvpCardMock from "../components/RsvpCardMock.jsx";

const BULLETS = [
  "Un enlace único por grupo",
  "Confirmación pase por pase",
  "Líder de grupo designado",
  "Conteo de confirmaciones en vivo",
  "Sin cuentas para tus invitados",
];

export default function FeatureRsvp() {
  return (
    <FeaturePlate
      id="rsvp"
      index="02"
      label="RSVP por grupo"
      title="Cada grupo, su propio enlace."
      lead="Comparte un enlace por grupo; nadie necesita crear cuenta. El líder confirma pase por pase y tú ves el conteo al instante."
      bullets={BULLETS}
      caption="Fig. 03 — Confirmación de la familia Herrera, grupo de cuatro pases."
      flip
      alt
    >
      <RsvpCardMock />
    </FeaturePlate>
  );
}
