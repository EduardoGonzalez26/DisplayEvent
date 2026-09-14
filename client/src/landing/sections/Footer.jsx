import { Link } from "react-router-dom";

const ANCHORS = [
  { href: "#invitaciones", label: "Invitaciones" },
  { href: "#rsvp", label: "RSVP por grupo" },
  { href: "#mesas", label: "Mesas" },
  { href: "#regalos", label: "Mesa de regalos" },
  { href: "#preguntas", label: "Preguntas" },
];

export default function Footer() {
  return (
    <footer className="de-footer">
      <div className="de-footer__inner">
        <div className="de-footer__brand">
          <span className="de-nav__brand">
            <img
              src="/logo.svg"
              alt=""
              className="de-nav__logo"
              width="34"
              height="28"
              decoding="async"
            />
            <span className="de-nav__wordmark">DisplayEvent</span>
          </span>
          <p className="de-footer__tagline">Papelería digital y logística de celebración.</p>
          <p className="de-footer__note">
            Invitaciones, confirmaciones y mesas en un solo panel.
          </p>
        </div>

        <nav className="de-footer__col" aria-label="Secciones de la landing">
          <span className="de-footer__title">Índice</span>
          {ANCHORS.map((anchor) => (
            <a key={anchor.href} href={anchor.href} className="de-footer__link">
              {anchor.label}
            </a>
          ))}
        </nav>

        <div className="de-footer__col">
          <span className="de-footer__title">Cuenta</span>
          <Link to="/login" className="de-footer__link">
            Iniciar sesión
          </Link>
          <Link to="/registro" className="de-footer__link">
            Crear cuenta
          </Link>
        </div>
      </div>

      <div className="de-footer__bottom">
        <span>© {new Date().getFullYear()} DisplayEvent</span>
        <span>Invitaciones digitales · Organización de eventos</span>
      </div>
    </footer>
  );
}
