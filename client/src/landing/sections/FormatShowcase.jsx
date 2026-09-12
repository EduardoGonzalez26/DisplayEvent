import { Reveal } from "../../invitation/motion.jsx";

// Paletas tomadas de client/src/invitation/themes/*.js
const FORMATS = [
  { id: "xv", label: "XV años", monogram: "XV", script: "Rosa y dorado", note: "Rosa, dorado y un toque editorial." },
  { id: "boda", label: "Boda", monogram: "A & J", script: "Marfil y salvia", note: "Marfil y salvia, sobrio y luminoso." },
  { id: "cumpleanos", label: "Cumpleaños", monogram: "¡Feliz!", script: "Pastel y festivo", note: "Pasteles frescos y tipografía festiva." },
  { id: "baby_shower", label: "Baby shower", monogram: "Baby", script: "Rosa y menta", note: "Rosa y menta, tierno y limpio." },
];

function FormatCard({ format, index }) {
  return (
    <Reveal className={`de-format de-format--${format.id}`} delay={index * 0.06}>
      <div className="de-format__preview" aria-hidden="true">
        <span className="de-format__monogram">{format.monogram}</span>
        <span className="de-format__script">{format.script}</span>
        <span className="de-format__swatches">
          <span className="de-format__swatch de-format__swatch--1" />
          <span className="de-format__swatch de-format__swatch--2" />
          <span className="de-format__swatch de-format__swatch--3" />
        </span>
      </div>
      <div className="de-format__body">
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
            Cada formato tiene su propia paleta y tipografía. Elige el que mejor hable de tu
            celebración y personalízalo con tus datos.
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
