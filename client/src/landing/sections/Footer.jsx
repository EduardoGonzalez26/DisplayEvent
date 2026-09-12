import { Link } from "react-router-dom";

const ANCHORS = [
  { href: "#formatos", label: "Formatos" },
  { href: "#funciones", label: "Funciones" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#preguntas", label: "Preguntas" },
];

export default function Footer() {
  return (
    <footer className="de-footer">
      <div className="de-footer__inner">
        <div className="de-footer__brand">
          <span className="de-nav__brand">
            <span className="de-nav__monogram" aria-hidden="true">
              DE
            </span>
            <span className="de-nav__wordmark">DisplayEvent</span>
          </span>
          <p className="de-footer__tagline">Hecho para celebrar juntos</p>
          <p className="de-footer__note">
            Invitaciones digitales y organización de eventos en un solo panel.
          </p>
        </div>

        <nav className="de-footer__col" aria-label="Enlaces del producto">
          <span className="de-footer__title">Producto</span>
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
      </div>
    </footer>
  );
}
