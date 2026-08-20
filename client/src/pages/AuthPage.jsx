import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { api } from "../api.js";
import { inputClass, Button } from "../components/ui.jsx";

export default function AuthPage({ mode }) {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = mode === "register";

  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Estado tras crear la cuenta: esperando verificación del correo.
  const [pendingEmail, setPendingEmail] = useState(null);
  const [resendEmail, setResendEmail] = useState(null);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (isRegister && form.password !== form.confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setSaving(true);
    try {
      if (isRegister) {
        await register({
          username: form.username,
          email: form.email,
          password: form.password,
        });
        setPendingEmail(form.email);
        setResendEmail(form.email);
      } else {
        await login({ username: form.username, password: form.password });
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      }
    } catch (err) {
      if (err.code === "EMAIL_NOT_VERIFIED") setResendEmail(err.email || form.username);
      setError(err.code === "EMAIL_NOT_VERIFIED" ? "email_not_verified" : err.message);
      setSaving(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg("");
    try {
      await api.auth.resendVerification(resendEmail || pendingEmail);
      setResendMsg("Correo reenviado. Revisa tu bandeja (y spam).");
    } catch (err) {
      setResendMsg(err.message);
    } finally {
      setResending(false);
    }
  };

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  // Pantalla posterior al registro: el correo debe verificarse antes de entrar.
  if (pendingEmail) {
    return (
      <div className="min-h-screen grid place-items-center px-4 animate-page-in">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 w-16 h-16 grid place-items-center rounded-full border border-indigo-500/40 bg-indigo-600/10 text-indigo-300 text-3xl">
            ✉
          </div>
          <h1 className="text-2xl font-bold text-gray-50">Revisa tu correo</h1>
          <p className="text-sm text-gray-400 mt-2 mb-6 leading-relaxed">
            Te enviamos un enlace de verificación a{" "}
            <span className="text-indigo-300 font-semibold">{pendingEmail}</span>. Confírmalo
            para poder iniciar sesión.
          </p>
          {resendMsg && <p className="text-sm text-gray-300 mb-4">{resendMsg}</p>}
          <Button variant="secondary" className="w-full mb-3" disabled={resending} onClick={handleResend}>
            {resending ? "Enviando…" : "Reenviar correo"}
          </Button>
          <Link
            to="/login"
            className="block text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  const emailNotVerified = error === "email_not_verified";

  return (
    <div className="min-h-screen grid place-items-center px-4 animate-page-in">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg shadow-indigo-900/50">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1Zm2 14H7v-2h7v2Zm3-4H7v-2h10v2Zm0-4H7V7h10v2Z" />
            </svg>
          </div>
        </div>

        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-gray-50">
            {isRegister ? "Crear cuenta" : "Iniciar sesión"}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {isRegister
              ? "Regístrate para administrar tus eventos"
              : "Accede al panel de DisplayEvent"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl shadow-indigo-950/30"
        >
          <label className="block mb-4">
            <span className="block text-sm font-medium text-gray-300 mb-1">
              Usuario o correo
            </span>
            <input
              className={inputClass}
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="tu_usuario"
              autoComplete="username"
              required
            />
          </label>

          {isRegister && (
            <label className="block mb-4">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                Correo
              </span>
              <input
                className={inputClass}
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="tucorreo@ejemplo.com"
                autoComplete="email"
                required
              />
            </label>
          )}

          <label className="block mb-4">
            <span className="block text-sm font-medium text-gray-300 mb-1">Contraseña</span>
            <input
              className={inputClass}
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
            />
          </label>

          {isRegister && (
            <label className="block mb-4">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                Confirmar contraseña
              </span>
              <input
                className={inputClass}
                name="confirm"
                type="password"
                value={form.confirm}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {emailNotVerified && (
            <div className="text-sm text-amber-300 bg-amber-500/10 border border-amber-600/40 rounded-lg px-3 py-2.5 mb-4">
              <p className="mb-2">
                Tu correo aún no ha sido verificado. Revisa la bandeja de tu correo y confirma el
                enlace que te enviamos.
              </p>
              <button
                type="button"
                disabled={resending}
                onClick={handleResend}
                className="underline text-amber-200 hover:text-white disabled:opacity-50"
              >
                {resending ? "Enviando…" : "Reenviar correo de verificación"}
              </button>
            </div>
          )}

          {error && !emailNotVerified && (
            <p className="text-sm text-red-400 mb-4">{error}</p>
          )}
          {resendMsg && emailNotVerified && (
            <p className="text-sm text-emerald-400 mb-4">{resendMsg}</p>
          )}

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Procesando…" : isRegister ? "Crear cuenta" : "Entrar"}
          </Button>
        </form>

        <p className="text-sm text-center text-gray-400 mt-5">
          {isRegister ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
          <Link
            to={isRegister ? "/login" : "/registro"}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            {isRegister ? "Inicia sesión" : "Regístrate"}
          </Link>
        </p>
      </div>
    </div>
  );
}