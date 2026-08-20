import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { query, pool } from "../db/index.js";
import { signToken, requireAuth, COOKIE_NAME, COOKIE_OPTIONS } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { sendVerificationEmail } from "../utils/mailer.js";

const router = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });
const verifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15 });

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

function setAuthCookie(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), COOKIE_OPTIONS);
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    email_verified: user.email_verified,
  };
}

function verificationUrlFor(token) {
  const base = process.env.CLIENT_URL || "http://localhost:5173";
  return `${base}/verificar-correo?token=${token}`;
}

async function setupVerification(userId, email, username) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + VERIFY_TTL_MS);
  await pool.query(
    `UPDATE users
     SET verification_token = $1, verification_token_expires_at = $2
     WHERE id = $3`,
    [token, expiresAt, userId]
  );
  await sendVerificationEmail({
    to: email,
    username,
    verificationUrl: verificationUrlFor(token),
  });
}

router.post("/register", registerLimiter, async (req, res, next) => {
  const { username, email, password } = req.body || {};
  try {
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "Usuario, correo y contraseña son obligatorios" });
    }
    const cleanUsername = String(username).trim().slice(0, 50);
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return res
        .status(400)
        .json({ error: "El usuario solo puede contener letras, números y . _ -" });
    }
    const cleanEmail = String(email).trim().toLowerCase().slice(0, 255);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      return res.status(400).json({ error: "El correo no tiene un formato válido" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    const existing = await query(
      `SELECT id, email_verified FROM users WHERE username = $1 OR email = $2`,
      [cleanUsername, cleanEmail]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Ese usuario o correo ya está registrado" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, email_verified`,
      [cleanUsername, cleanEmail, passwordHash]
    );
    const user = rows[0];

    try {
      await setupVerification(user.id, cleanEmail, user.username);
    } catch (err) {
      // Si el correo no se puede enviar, no dejamos cuentas huérfanas sin verificar.
      await pool.query(`DELETE FROM users WHERE id = $1`, [user.id]).catch(() => {});
      console.error("[auth] No se pudo enviar el correo de verificación:", err.message);
      return res.status(503).json({
        error: "No se pudo enviar el correo de verificación",
        detail: err.message,
      });
    }

    res.status(201).json({
      user: publicUser(user),
      email_verification_required: true,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", loginLimiter, async (req, res, next) => {
  const { username, password } = req.body || {};
  try {
    if (!username || !password) {
      return res.status(400).json({ error: "Ingresa tu usuario y contraseña" });
    }
    const rows = await query(
      `SELECT id, username, email, email_verified, password_hash
       FROM users WHERE username = $1 OR email = $1 LIMIT 1`,
      [String(username).trim()]
    );
    const user = rows[0];
    const ok = user && (await bcrypt.compare(String(password), user.password_hash));
    if (!ok) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }
    if (!user.email_verified) {
      return res.status(403).json({
        error: "Antes de iniciar sesión verifica tu correo con el enlace que te enviamos.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }
    setAuthCookie(res, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// Valida el token enviado por correo y marca el email como verificado.
router.post("/verify", verifyLimiter, async (req, res, next) => {
  const { token } = req.body || {};
  try {
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Falta el token de verificación" });
    }
    const rows = await query(
      `SELECT id, email, email_verified, verification_token_expires_at FROM users
       WHERE verification_token = $1 LIMIT 1`,
      [token]
    );
    const user = rows[0];
    if (!user) {
      return res.status(400).json({ error: "El enlace es inválido o ya fue usado" });
    }
    if (user.verification_token_expires_at && new Date(user.verification_token_expires_at) < new Date()) {
      return res.status(400).json({ error: "El enlace expiró. Solicita reenviar la verificación" });
    }
    if (user.email_verified) {
      return res.json({ ok: true, already_verified: true });
    }
    await pool.query(
      `UPDATE users
       SET email_verified = TRUE, verification_token = NULL, verification_token_expires_at = NULL
       WHERE id = $1`,
      [user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Reenvía el correo de verificación si el usuario no lo ha confirmado todavía.
router.post("/resend-verification", verifyLimiter, async (req, res, next) => {
  const { email } = req.body || {};
  try {
    if (!email) {
      return res.status(400).json({ error: "Ingresa tu correo" });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const rows = await query(
      `SELECT id, username, email, email_verified FROM users
       WHERE email = $1 OR username = $1 LIMIT 1`,
      [cleanEmail]
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: "No encontramos un correo pendiente de verificación" });
    }
    if (user.email_verified) {
      return res.status(400).json({ error: "Tu correo ya fue verificado. Ya puedes iniciar sesión" });
    }
    await setupVerification(user.id, user.email, user.username);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: undefined });
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, username, email, email_verified FROM users WHERE id = $1 LIMIT 1`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(401).json({ error: "No autorizado" });
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;