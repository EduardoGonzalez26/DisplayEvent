import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="text-gray-400 py-10 text-center">Cargando…</p>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}