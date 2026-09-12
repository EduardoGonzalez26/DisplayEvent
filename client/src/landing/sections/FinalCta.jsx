import { Link } from "react-router-dom";
import { useAuth } from "../../auth.jsx";
import Ornament from "../components/Ornament.jsx";

export default function FinalCta() {
  const { user, loading } = useAuth();

  return (
    <section className="de-cta-final">
      <div className="de-cta-final__inner">
        <Ornament className="de-cta-final__ornament" />
        <h2 className="de-cta-final__title">¿Listo para organizar tu próxima celebración?</h2>
        <div className="de-cta-final__actions">
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
      </div>
    </section>
  );
}
