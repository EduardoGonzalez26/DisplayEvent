import { Reveal } from "../../invitation/motion.jsx";

// Bloque editorial de función: número y rótulo al margen, texto a la
// izquierda o derecha y una lámina (figure) con pie de foto "Fig. NN".
export default function FeaturePlate({
  id,
  index,
  label,
  title,
  lead,
  bullets,
  caption,
  flip = false,
  alt = false,
  children,
}) {
  const classes = [
    "de-feature",
    alt ? "de-feature--alt" : "",
    flip ? "de-feature--flip" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section id={id} className={classes}>
      <div className="de-feature__inner">
        <div className="de-feature__aside">
          <span className="de-feature__index">N.º {index}</span>
          <span className="de-feature__label">{label}</span>
        </div>

        <Reveal className="de-feature__copy">
          <h2 className="de-feature__title">{title}</h2>
          <p className="de-feature__lead">{lead}</p>
          <ul className="de-feature__list">
            {bullets.map((bullet) => (
              <li key={bullet} className="de-feature__item">
                {bullet}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="de-feature__media" delay={0.1}>
          <figure className="de-figure">
            <div className="de-figure__frame">{children}</div>
            <figcaption className="de-figure__caption">{caption}</figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
