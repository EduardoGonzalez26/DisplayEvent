import FeaturePlate from "../components/FeaturePlate.jsx";
import GiftCardMock from "../components/GiftCardMock.jsx";

const BULLETS = [
  "Depósito o transferencia bancaria",
  "Pago con tarjeta cuando lo activas",
  "Montos sugeridos a tu gusto",
  "Pesos o euros",
];

export default function FeatureGifts() {
  return (
    <FeaturePlate
      id="regalos"
      index="04"
      label="Mesa de regalos"
      title="Regalos a tu manera."
      lead="Comparte tus datos para depósito o transferencia, o habilita el pago con tarjeta desde tu cuenta. Tú eliges los montos sugeridos y la moneda: pesos o euros."
      bullets={BULLETS}
      caption="Fig. 05 — Mesa de regalos con montos sugeridos."
      flip
      alt
    >
      <GiftCardMock />
    </FeaturePlate>
  );
}
