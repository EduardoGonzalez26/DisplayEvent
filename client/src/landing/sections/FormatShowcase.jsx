import { Reveal } from "../../invitation/motion.jsx";

// Paletas tomadas de client/src/invitation/themes/*.js
const FORMATS = [
  {
    id: "xv",
    num: "01",
    label: "XV años",
    monogram: "XV",
    note: "Rosa, dorado y aire editorial.",
  },
  {
    id: "boda",
    num: "02",
    label: "Boda",
    monogram: "A & J",
    note: "Marfil y salvia, sobrio y luminoso.",
  },
  {
    id: "cumpleanos",
    num: "03",
    label: "Cumpleaños",
    monogram: "¡Feliz!",
    note: "Pasteles frescos y tipografía festiva.",
  },
  {
    id: "baby_shower",
    num: "04",
    label: "Baby shower",
    monogram: "Baby",
    note: "Rosa y menta, tierno y limpio.",
  },
];

function FormatCard({ format, index }) {
  return (
    <Reveal className={`de-format de-format--${format.id}`} delay={index * 0.06}>
      <div className="de-format__specimen" aria-hidden="true">
        <span className="de-format__monogram">{format.monogram}</span>
        <span className="de-format__swatches">
          <span className="de-format__swatch de-format__swatch--1" />
          <span className="de-format__swatch de-format__swatch--2" />
          <span className="de-format__swatch de-format__swatch--3" />
        </span>
      </div>
      <div className="de-format__body">
        <span className="de-format__num" aria-hidden="true">
          N.º {format.num}
        </span>
        <h3 className="de-format__label">{format.label}</h3>
        <p className="de-format__note">{format.note}</p>
      </div>
    </Reveal>
  );
}

export default function FormatShowcase() {
  return (
    <section id="formatos" className="de-formats">
      <div className="de-formats__inner">
        <Reveal className="de-formats__head">
          <p className="de-eyebrow">Formatos</p>
          <h2 className="de-section-title">Un diseño para cada celebración</h2>
          <p className="de-section-lead">
            Cada formato tiene su propia paleta y tipografía. Empieza por el que más te guste y
            personalízalo con los datos de tu fiesta.
          </p>
        </Reveal>

        <div className="de-formats__grid">
          {FORMATS.map((format, i) => (
            <FormatCard key={format.id} format={format} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
