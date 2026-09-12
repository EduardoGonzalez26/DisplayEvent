import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth.jsx";

const LINKS = [
  { href: "#formatos", label: "Formatos" },
  { href: "#funciones", label: "Funciones" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#preguntas", label: "Preguntas" },
];

export default function Nav() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`de-nav${scrolled ? " de-nav--scrolled" : ""}`}>
      <div className="de-nav__inner">
        <a href="#inicio" className="de-nav__brand" aria-label="DisplayEvent, ir al inicio">
          <span className="de-nav__monogram" aria-hidden="true">
            DE
          </span>
          <span className="de-nav__wordmark">DisplayEvent</span>
        </a>

        <nav className="de-nav__links" aria-label="Secciones de la página">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="de-nav__link">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="de-nav__actions">
          {loading ? (
            <span className="de-cta-placeholder de-cta-placeholder--nav" aria-hidden="true" />
          ) : user ? (
            <Link to="/eventos" className="de-btn de-btn--primary de-btn--sm">
              Ir a mis eventos
            </Link>
          ) : (
            <>
              <Link to="/login" className="de-nav__login">
                Iniciar sesión
              </Link>
              <Link to="/registro" className="de-btn de-btn--primary de-btn--sm">
                Crear mi evento
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
