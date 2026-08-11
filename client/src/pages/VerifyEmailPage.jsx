import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { Button } from "../components/ui.jsx";

const STATUS = { LOADING: "loading", OK: "ok", ALREADY: "already", ERROR: "error" };

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState(STATUS.LOADING);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus(STATUS.ERROR);
      setMessage("Falta el token de verificación. Revisa el enlace que te enviamos por correo.");
      return;
    }
    api.auth
      .verify(token)
      .then((data) => setStatus(data.already_verified ? STATUS.ALREADY : STATUS.OK))
      .catch((err) => {
        setStatus(STATUS.ERROR);
        setMessage(err.message);
      });
  }, [token]);

  return (
    <div className="min-h-screen grid place-items-center px-4 animate-page-in">
      <div className="w-full max-w-md text-center">
        <div
          className={`mx-auto mb-6 w-16 h-16 grid place-items-center rounded-full border text-3xl ${
            status === STATUS.ERROR
              ? "border-red-900 bg-red-600/10 text-red-400"
              : "border-emerald-900 bg-emerald-600/10 text-emerald-400"
          }`}
        >
          {status === STATUS.LOADING ? "…" : status === STATUS.ERROR ? "×" : "✓"}
        </div>

        {status === STATUS.LOADING && (
          <>
            <h1 className="text-2xl font-bold text-gray-50">Verificando tu correo…</h1>
            <p className="text-sm text-gray-400 mt-2">Un momento por favor.</p>
          </>
        )}

        {status === STATUS.OK && (
          <>
            <h1 className="text-2xl font-bold text-gray-50">Correo verificado</h1>
            <p className="text-sm text-gray-400 mt-2 mb-6">
              Tu cuenta está lista. Ahora puedes iniciar sesión.
            </p>
            <Link to="/login">
              <Button className="px-8">Ir a iniciar sesión</Button>
            </Link>
          </>
        )}

        {status === STATUS.ALREADY && (
          <>
            <h1 className="text-2xl font-bold text-gray-50">Ya estabas verificado</h1>
            <p className="text-sm text-gray-400 mt-2 mb-6">
              Tu correo ya fue confirmado anteriormente. Inicia sesión para continuar.
            </p>
            <Link to="/login">
              <Button className="px-8">Ir a iniciar sesión</Button>
            </Link>
          </>
        )}

        {status === STATUS.ERROR && (
          <>
            <h1 className="text-2xl font-bold text-gray-50">No pudimos verificar tu correo</h1>
            <p className="text-sm text-gray-400 mt-2 mb-6">{message || "El enlace es inválido o expiró."}</p>
            <Link to="/login">
              <Button variant="secondary" className="px-8">
                Volver al inicio de sesión
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}