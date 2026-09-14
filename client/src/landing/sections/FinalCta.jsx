import { Link } from "react-router-dom";
import { useAuth } from "../../auth.jsx";

export default function FinalCta() {
  const { user, loading } = useAuth();

  return (
    <section className="de-cta">
      <div className="de-cta__inner">
        <img
          src="/logo.svg"
          alt=""
          className="de-cta__logo"
          width="56"
          height="46"
          decoding="async"
          aria-hidden="true"
        />
        <h2 className="de-cta__title">Publica tu primera invitación esta tarde</h2>
        <p className="de-cta__lead">
          Crea tu cuenta, elige un formato y comparte el primer enlace. Las confirmaciones empiezan
          a llegar solas.
        </p>
        <div className="de-cta__actions">
          {loading ? (
            <span className="de-cta-placeholder" aria-hidden="true" />
          ) : user ? (
            <Link to="/eventos" className="de-btn de-btn--primary de-btn--lg">
              Ir a mis eventos
            </Link>
          ) : (
            <Link to="/registro" className="de-btn de-btn--primary de-btn--lg">
              Crear mi evento
            </Link>
          )}
        </div>
        <p className="de-cta__meta">
          Tus invitados no necesitan cuenta · Puedes editar después de compartir
        </p>
      </div>
    </section>
  );
}
