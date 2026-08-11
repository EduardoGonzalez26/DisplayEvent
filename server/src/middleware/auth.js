import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "cambia-este-secreto-por-uno-seguro";
const TOKEN_TTL = Number(process.env.JWT_EXPIRES_IN || 7 * 24 * 60 * 60);

export const COOKIE_NAME = "de_token";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: TOKEN_TTL * 1000,
};

export function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Exige una sesión válida (JWT en cookie httpOnly).
export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "No autorizado, inicia sesión" });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Sesión inválida o expirada" });
  }
}

// Protección CSRF: solo admite peticiones cuyo origen coincide con el servidor.
export function csrfProtection(req, res, next) {
  const method = req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();

  const origin = req.headers.origin;
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const sameOrigin = originHost === req.get("host");
      const localhost = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(originHost);
      if (sameOrigin || localhost) return next();
      return res.status(403).json({ error: "Petición no permitida" });
    } catch {
      return res.status(403).json({ error: "Origen inválido" });
    }
  }
  next();
}