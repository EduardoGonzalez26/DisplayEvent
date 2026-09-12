import { Reveal } from "../../invitation/motion.jsx";
import TableMock from "../components/TableMock.jsx";

const BULLETS = [
  "Arrastrar y soltar",
  "Capacidad validada",
  "Mesas de niños",
  "Acompañantes en bloque",
  "Imprimir",
  "Exportar CSV",
];

export default function FeatureTables() {
  return (
    <section className="de-feature">
      <div className="de-feature__inner">
        <Reveal className="de-feature__copy">
          <p className="de-eyebrow">Mesas</p>
          <h2 className="de-feature__title">Acomoda mesas sin hojas de cálculo</h2>
          <p className="de-feature__text">
            Arrastra y suelta invitados confirmados en mesas con capacidad validada. Agrupa
            acompañantes en bloque, crea mesas de niños y comparte la distribución: imprime o
            exporta a CSV.
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
            <TableMock />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
