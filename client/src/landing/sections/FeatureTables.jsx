import FeaturePlate from "../components/FeaturePlate.jsx";
import TableMock from "../components/TableMock.jsx";

const BULLETS = [
  "Arrastrar y soltar",
  "Capacidad de cada mesa validada",
  "Mesas de niños",
  "Acompañantes que se mueven en bloque",
  "Lista lista para imprimir",
  "Exportación a CSV",
];

export default function FeatureTables() {
  return (
    <FeaturePlate
      id="mesas"
      index="03"
      label="Mesas"
      title="Acomoda mesas sin hojas de cálculo."
      lead="Arrastra a cada invitado confirmado hasta su lugar y deja que el sistema cuide la capacidad. Mueve acompañantes en bloque, arma la mesa de niños y lleva la distribución impresa o en CSV."
      bullets={BULLETS}
      caption="Fig. 04 — Mesa 3 con siete de ocho lugares ocupados."
    >
      <TableMock />
    </FeaturePlate>
  );
}
