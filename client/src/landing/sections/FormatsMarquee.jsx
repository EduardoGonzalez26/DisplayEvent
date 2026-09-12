const FORMATS = ["XV años", "Bodas", "Cumpleaños", "Baby showers"];

function Row({ ghost }) {
  return (
    <ul className="de-marquee__list" aria-hidden={ghost ? "true" : undefined}>
      {FORMATS.map((format) => (
        <li key={format} className="de-marquee__item">
          <span>{format}</span>
          <svg className="de-marquee__dot" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
            <path d="M6 0l1.7 4.3L12 6 7.7 7.7 6 12 4.3 7.7 0 6l4.3-1.7L6 0Z" fill="currentColor" />
          </svg>
        </li>
      ))}
    </ul>
  );
}

// Marquesina decorativa; la segunda lista es una copia visual para el bucle.
export default function FormatsMarquee() {
  return (
    <section className="de-marquee" aria-label="Tipos de celebración">
      <div className="de-marquee__track">
        <Row />
        <Row ghost />
      </div>
    </section>
  );
}
