import { Reveal } from "../../invitation/motion.jsx";
import GiftCardMock from "../components/GiftCardMock.jsx";

const BULLETS = [
  "Depósito/transferencia bancaria",
  "Pago con tarjeta vía Stripe",
  "Montos sugeridos",
  "MXN y EUR",
];

export default function FeatureGifts() {
  return (
    <section className="de-feature de-feature--alt de-feature--flip">
      <div className="de-feature__inner">
        <Reveal className="de-feature__copy">
          <p className="de-eyebrow">Mesa de regalos</p>
          <h2 className="de-feature__title">Mesa de regalos a tu manera</h2>
          <p className="de-feature__text">
            Recibe regalos por depósito o transferencia bancaria, o con pago con tarjeta vía Stripe.
            Tú eliges los montos sugeridos y la moneda: MXN o EUR.
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
            <GiftCardMock />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
