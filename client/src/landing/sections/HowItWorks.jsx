import { Reveal } from "../../invitation/motion.jsx";

const STEPS = [
  {
    num: "01",
    title: "Crea tu evento",
    text: "Elige formato, captura fecha, lugar y listas. La invitación queda armada en minutos.",
  },
  {
    num: "02",
    title: "Comparte el enlace de cada grupo",
    text: "Cada grupo recibe el suyo; tus invitados abren, leen y responden sin crear cuenta.",
  },
  {
    num: "03",
    title: "Sigue las confirmaciones y acomoda mesas",
    text: "Conteo en vivo, capacidad de cada mesa validada y una lista final lista para imprimir.",
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="de-how">
      <div className="de-how__inner">
        <Reveal className="de-how__head">
          <p className="de-eyebrow">Cómo funciona</p>
          <h2 className="de-section-title">Tres pasos, cero hojas de cálculo</h2>
        </Reveal>

        <div className="de-how__ledger">
          {STEPS.map((step, i) => (
            <Reveal key={step.num} className="de-how__row" delay={i * 0.06}>
              <span className="de-how__num" aria-hidden="true">
                {step.num}
              </span>
              <h3 className="de-how__title">{step.title}</h3>
              <p className="de-how__text">{step.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
