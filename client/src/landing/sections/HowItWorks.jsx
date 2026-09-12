import { Reveal } from "../../invitation/motion.jsx";

const STEPS = [
  {
    num: "01",
    title: "Crea tu evento",
    text: "Elige formato, captura los datos y personaliza la invitación.",
  },
  {
    num: "02",
    title: "Comparte el enlace de cada grupo",
    text: "Cada grupo recibe su enlace con token; no necesitan cuenta.",
  },
  {
    num: "03",
    title: "Sigue las confirmaciones y acomoda mesas",
    text: "Mira el conteo en vivo, valida pases y organiza las mesas para imprimir.",
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="de-how">
      <div className="de-how__inner">
        <Reveal className="de-how__head">
          <p className="de-eyebrow">Paso a paso</p>
          <h2 className="de-section-title">Cómo funciona</h2>
        </Reveal>

        <div className="de-how__steps">
          {STEPS.map((step, i) => (
            <Reveal key={step.num} className="de-how__step" delay={i * 0.08}>
              <span className="de-how__num" aria-hidden="true">
                {step.num}
              </span>
              <h3 className="de-how__step-title">{step.title}</h3>
              <p className="de-how__step-text">{step.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
