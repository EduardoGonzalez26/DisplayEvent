const ITEMS = [
  {
    num: "01",
    title: "Invitaciones",
    note: "Seis diseños con sobre digital, itinerario y mapas.",
    href: "#invitaciones",
  },
  {
    num: "02",
    title: "RSVP por grupo",
    note: "Un enlace por grupo; confirmación pase por pase.",
    href: "#rsvp",
  },
  {
    num: "03",
    title: "Mesas",
    note: "Arrastrar y soltar con capacidad validada.",
    href: "#mesas",
  },
  {
    num: "04",
    title: "Mesa de regalos",
    note: "Transferencia o tarjeta; montos a tu gusto.",
    href: "#regalos",
  },
];

// Índice tipográfico de funciones (sustituye a la marquesina decorativa):
// un renglón de imprenta con hairlines finas sobre fondo de tinta.
export default function Index() {
  return (
    <section id="funciones" className="de-index" aria-label="Índice de funciones">
      <div className="de-index__inner">
        <p className="de-index__label" aria-hidden="true">
          Índice
        </p>
        <ol className="de-index__grid">
          {ITEMS.map((item) => (
            <li key={item.href} className="de-index__cell">
              <a className="de-index__item" href={item.href}>
                <span className="de-index__num" aria-hidden="true">
                  {item.num}
                </span>
                <span className="de-index__title">{item.title}</span>
                <span className="de-index__note">{item.note}</span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
