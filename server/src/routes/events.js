import { Router } from "express";
import { query, pool } from "../db/index.js";
import { parseInvitation, normalizeForRead } from "../schemas/invitation.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [{ total }] = await query(
      `SELECT COUNT(*)::int AS total FROM events WHERE user_id = $1`,
      [req.user.id]
    );

    const rows = await query(
      `SELECT e.*,
              (SELECT COUNT(*) FROM "groups" g WHERE g.event_id = e.id)::int AS groups_count,
              (SELECT COUNT(*) FROM guests gu
                 JOIN "groups" g ON g.id = gu.group_id
                 WHERE g.event_id = e.id)::int AS guests_count,
              (SELECT COUNT(*) FROM guests gu
                 JOIN "groups" g ON g.id = gu.group_id
                 WHERE g.event_id = e.id AND gu.is_child)::int AS children_count,
              (SELECT COUNT(*) FROM guests gu
                 JOIN "groups" g ON g.id = gu.group_id
                 WHERE g.event_id = e.id AND gu.registered)::int AS registered_count
       FROM events e
       WHERE e.user_id = $1
       ORDER BY e.date DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      data: rows,
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// Debe declararse ANTES de GET /:id para que ":id" no capture "slug-available".
router.get("/slug-available", async (req, res, next) => {
  try {
    const raw = req.query.slug;
    if (typeof raw !== "string" || !raw.trim()) {
      return res.json({ available: false, reason: "El slug no puede estar vacío" });
    }
    const slug = normalizeSlug(raw);
    const reason = slugFormatError(slug);
    if (reason) return res.json({ available: false, reason });

    // Unicidad global: el índice único cubre todos los eventos (no solo los del usuario).
    const rows = await query(`SELECT 1 FROM events WHERE slug = $1 LIMIT 1`, [slug]);
    res.json({ available: rows.length === 0 });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/stats", async (req, res, next) => {
  try {
    const eventRow = await query(`SELECT id FROM events WHERE id = $1 AND user_id = $2 LIMIT 1`, [
      req.params.id,
      req.user.id,
    ]);
    if (eventRow.length === 0) return res.status(404).json({ error: "Evento no encontrado" });

    const [groupsRow] = await query(
      `SELECT COUNT(*)::int AS total_groups FROM "groups" WHERE event_id = $1`,
      [req.params.id]
    );

    const [guestStats] = await query(
      `SELECT COUNT(*)::int AS total_guests,
              COUNT(*) FILTER (WHERE gu.is_child)::int AS children_count,
              COUNT(*) FILTER (WHERE NOT gu.is_child)::int AS adults_count
       FROM guests gu
       JOIN "groups" g ON g.id = gu.group_id
       WHERE g.event_id = $1`,
      [req.params.id]
    );

    const [rsvpStats] = await query(
      `SELECT COUNT(*) FILTER (WHERE gu.registered)::int AS registered_count,
              COUNT(*) FILTER (WHERE gu.declined)::int AS declined_count,
              COUNT(*) FILTER (WHERE NOT gu.registered AND NOT gu.declined)::int AS unregistered_count
       FROM guests gu
       JOIN "groups" g ON g.id = gu.group_id
       WHERE g.event_id = $1`,
      [req.params.id]
    );

    res.json({
      total_groups: groupsRow.total_groups,
      total_guests: guestStats.total_guests,
      children_count: guestStats.children_count,
      adults_count: guestStats.adults_count,
      registered_count: rsvpStats.registered_count,
      declined_count: rsvpStats.declined_count,
      unregistered_count: rsvpStats.unregistered_count,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/invitation", async (req, res, next) => {
  try {
    const rows = await query(`SELECT invitation FROM events WHERE id = $1 AND user_id = $2 LIMIT 1`, [
      req.params.id,
      req.user.id,
    ]);
    if (rows.length === 0) return res.status(404).json({ error: "Evento no encontrado" });
    res.json(normalizeForRead(rows[0].invitation));
  } catch (err) {
    next(err);
  }
});

router.put("/:id/invitation", async (req, res, next) => {
  const invitation = req.body;
  if (!invitation || typeof invitation !== "object" || Array.isArray(invitation)) {
    return res.status(400).json({ error: "La configuración de invitación es inválida" });
  }
  // Valida y normaliza ANTES de persistir (contrato v2). Mantiene el merge `||`
  // con lo ya guardado, igual que antes.
  let parsed;
  try {
    parsed = parseInvitation(invitation);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  try {
    const result = await pool.query(
      `UPDATE events
       SET invitation = COALESCE(invitation, '{}'::jsonb) || $1::jsonb
       WHERE id = $2 AND user_id = $3
       RETURNING invitation`,
      [JSON.stringify(parsed), req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Evento no encontrado" });
    res.json({ ok: true, invitation: result.rows[0].invitation });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const rows = await query(`SELECT * FROM events WHERE id = $1 AND user_id = $2 LIMIT 1`, [
      req.params.id,
      req.user.id,
    ]);
    if (rows.length === 0) return res.status(404).json({ error: "Evento no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

function cleanRequiredString(value, maxLen) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

function isValidDate(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  );
}

function isValidTime(value) {
  if (typeof value !== "string" || !TIME_RE.test(value)) return false;
  const [h, mi] = value.split(":").map(Number);
  return h >= 0 && h <= 23 && mi >= 0 && mi <= 59;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 60;

// Convierte texto libre en slug URL-amigable: minúsculas, sin acentos,
// espacios/underscores -> "-", solo [a-z0-9-], sin guiones repetidos ni en
// los extremos y con un máximo de 60 caracteres.
function slugify(value) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}

// Normaliza lo que llega del cliente (trim + lower + slugify). "" si no queda nada.
function normalizeSlug(value) {
  if (typeof value !== "string") return "";
  return slugify(value.trim().toLowerCase());
}

// Devuelve el motivo del error o "" si el slug normalizado es válido.
function slugFormatError(slug) {
  if (!slug) return "El slug no puede estar vacío";
  if (slug.length < SLUG_MIN_LENGTH) {
    return `El slug debe tener al menos ${SLUG_MIN_LENGTH} caracteres`;
  }
  if (slug.length > SLUG_MAX_LENGTH) {
    return `El slug no puede superar los ${SLUG_MAX_LENGTH} caracteres`;
  }
  if (!SLUG_RE.test(slug)) {
    return "El slug solo puede contener letras minúsculas, números y guiones (sin guiones consecutivos)";
  }
  return "";
}

// Interpreta el slug opcional del body. Devuelve "" cuando no se envió (o se
// envió vacío) para que la ruta lo autogenere desde el nombre del evento.
function parseSlugInput(slug) {
  if (slug === undefined || slug === null) return { value: "" };
  if (typeof slug !== "string") return { error: "El slug es inválido" };
  if (!slug.trim()) return { value: "" };
  const normalized = normalizeSlug(slug);
  const error = slugFormatError(normalized);
  if (error) return { error };
  return { value: normalized };
}

// Busca un slug libre. Si `base` ya está tomado prueba `base-2`, `base-3`, ...
// `excludeId` permite ignorar el propio evento al editarlo. Los slugs generados
// respetan el máximo de 60 caracteres.
async function generateUniqueSlug(base, excludeId = null) {
  let root =
    typeof base === "string" ? base.slice(0, SLUG_MAX_LENGTH).replace(/-+$/g, "") : "";
  if (root.length < SLUG_MIN_LENGTH) root = "evento";

  const params = [`${root}%`];
  let sql = `SELECT slug FROM events WHERE slug LIKE $1`;
  if (excludeId != null) {
    params.push(excludeId);
    sql += ` AND id <> $2`;
  }
  const rows = await query(sql, params);
  const taken = new Set(rows.map((row) => row.slug));

  if (!taken.has(root)) return root;

  for (let n = 2; n <= 999; n += 1) {
    const suffix = `-${n}`;
    const candidate = `${root.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/g, "")}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  // Fallback prácticamente inalcanzable.
  const suffix = `-${Date.now().toString(36)}`;
  return `${root.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/g, "")}${suffix}`;
}

// Valida y normaliza el payload de un evento (POST/PUT).
function validateEventPayload({ name, date, time, place, slug }) {
  const cleanName = cleanRequiredString(name, 255);
  const cleanPlace = cleanRequiredString(place, 255);
  if (!cleanName) return { error: "El nombre del evento es obligatorio" };
  if (!isValidDate(date)) return { error: "La fecha no es válida (formato AAAA-MM-DD)" };
  if (!isValidTime(time)) return { error: "La hora no es válida (formato HH:MM)" };
  if (!cleanPlace) return { error: "El lugar es obligatorio" };

  const parsedSlug = parseSlugInput(slug);
  if (parsedSlug.error) return { error: parsedSlug.error };

  return {
    value: { name: cleanName, date, time, place: cleanPlace, slug: parsedSlug.value },
  };
}

router.post("/", async (req, res, next) => {
  const validated = validateEventPayload(req.body || {});
  if (validated.error) return res.status(400).json({ error: validated.error });
  const { name, date, time, place, slug: requestedSlug } = validated.value;
  try {
    // Slug explícito si es válido; si no, se autogenera desde el nombre.
    const slug = await generateUniqueSlug(requestedSlug || slugify(name));
    const result = await pool.query(
      `INSERT INTO events (user_id, name, date, time, place, slug)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, name, date, time, place, slug]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505" && err.constraint === "idx_events_slug") {
      return res.status(409).json({ error: "El slug ya está en uso" });
    }
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  const validated = validateEventPayload(req.body || {});
  if (validated.error) return res.status(400).json({ error: validated.error });
  const { name, date, time, place, slug: requestedSlug } = validated.value;
  try {
    // Excluye el propio evento: si el slug no cambia se conserva tal cual y,
    // si está tomado por otro, se añade sufijo (-2, -3, ...).
    const slug = await generateUniqueSlug(requestedSlug || slugify(name), req.params.id);
    const result = await pool.query(
      `UPDATE events SET name = $1, date = $2, time = $3, place = $4, slug = $5
       WHERE id = $6 AND user_id = $7 RETURNING *`,
      [name, date, time, place, slug, req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Evento no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505" && err.constraint === "idx_events_slug") {
      return res.status(409).json({ error: "El slug ya está en uso" });
    }
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await pool.query(`DELETE FROM events WHERE id = $1 AND user_id = $2`, [
      req.params.id,
      req.user.id,
    ]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Evento no encontrado" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;