import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.auth.me();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Si la sesión expira durante el uso, cierra la sesión local para volver a /login.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener("de:unauthorized", onUnauthorized);
    return () => window.removeEventListener("de:unauthorized", onUnauthorized);
  }, []);

  const login = async (payload) => {
    const data = await api.auth.login(payload);
    setUser(data.user);
    return data.user;
  };

  // El registro NO crea sesión: la cuenta queda pendiente hasta verificar el correo.
  const register = async (payload) => {
    const data = await api.auth.register(payload);
    return data;
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}