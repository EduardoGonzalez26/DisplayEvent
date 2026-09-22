-- Esquema canónico PostgreSQL de DisplayEvent (fuente única de verdad).
-- Destinado a Supabase (Postgres). No usa CREATE DATABASE: se ejecuta sobre la base ya creada.
--
-- IDEMPOTENTE Y NO DESTRUCTIVO: seguro en BD nuevas y existentes, y se puede pegar
-- completo en el SQL Editor de Supabase las veces que haga falta sin errores.
-- Las migraciones de ESQUEMA (antes en src/db/init.js) están consolidadas aquí;
-- los backfills de DATOS siguen en src/db/init.js.

-- ===========================================================================
-- 1) Tablas
-- ===========================================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_token VARCHAR(255),
  verification_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  place VARCHAR(255) NOT NULL,
  invitation JSONB,
  slug VARCHAR(80),
  -- Dominio personalizado de la invitación del evento (ej. "fiesta.midominio.com").
  -- NULL = se usa el dominio por defecto de la plataforma.
  custom_domain VARCHAR(255),
  -- Mensaje editable de la invitación por WhatsApp. Placeholders admitidos:
  -- {{lider}}, {{evento}}, {{fecha}}, {{lugar}}, {{enlace}}. NULL = preset por defecto.
  whatsapp_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_user ON events(user_id);

CREATE TABLE IF NOT EXISTS "groups" (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  leader_name VARCHAR(255),
  invitation_token VARCHAR(64) UNIQUE,
  rsvp_note VARCHAR(500),
  high_chairs BOOLEAN NOT NULL DEFAULT FALSE,
  high_chairs_count INT NOT NULL DEFAULT 0,
  -- Teléfono E.164 del líder (+52...), usado para enviar la invitación por WhatsApp.
  leader_phone VARCHAR(20),
  -- Última vez que se confirmó el envío de la invitación al líder.
  whatsapp_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_event ON "groups"(event_id);
CREATE INDEX IF NOT EXISTS idx_group_token ON "groups"(invitation_token);

-- Tokens de invitación revocados: al regenerar el token de un grupo, el
-- anterior queda aquí y deja de funcionar (invalida enlaces y copias impresas).
CREATE TABLE IF NOT EXISTS revoked_invitation_tokens (
  token VARCHAR(64) PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "tables" (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  capacity INT NOT NULL DEFAULT 8,
  shape VARCHAR(10) NOT NULL DEFAULT 'circle' CHECK (shape IN ('circle', 'square', 'rect')),
  position INT NOT NULL DEFAULT 0,
  is_kids BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_table_event ON "tables"(event_id);

CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  group_id INT NOT NULL REFERENCES "groups"(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_child BOOLEAN NOT NULL DEFAULT FALSE,
  is_leader BOOLEAN NOT NULL DEFAULT FALSE,
  registered BOOLEAN NOT NULL DEFAULT FALSE,
  declined BOOLEAN NOT NULL DEFAULT FALSE,
  table_id INT REFERENCES "tables"(id) ON DELETE SET NULL,
  companion_id INT REFERENCES guests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guest_group ON guests(group_id);
CREATE INDEX IF NOT EXISTS idx_guest_table ON guests(table_id);
CREATE INDEX IF NOT EXISTS idx_guest_companion ON guests(companion_id);

CREATE TABLE IF NOT EXISTS invitation_templates (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inv_templates_user ON invitation_templates(user_id);

-- Aportaciones/regalos confirmados vía Stripe.
CREATE TABLE IF NOT EXISTS gifts (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  group_id INT REFERENCES "groups"(id) ON DELETE SET NULL,
  amount_minor BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gifts_event ON gifts(event_id);

-- Un payment intent se corresponde 1:1 con una sesión de checkout completada.
-- El índice único da idempotencia al webhook (ON CONFLICT DO NOTHING) y evita
-- regalos duplicados cuando Stripe reenvía el mismo evento.
CREATE UNIQUE INDEX IF NOT EXISTS idx_gifts_payment_intent ON gifts(stripe_payment_intent_id);

-- ===========================================================================
-- 2) Migraciones idempotentes para BD creadas antes de las últimas columnas.
--    Antes vivían en src/db/init.js; consolidadas aquí como fuente única.
-- ===========================================================================

-- 2.1) groups.invitation_token pasó a VARCHAR(64) (en BD viejas era más corto).
ALTER TABLE "groups" ALTER COLUMN invitation_token TYPE VARCHAR(64);

-- 2.2) Columnas añadidas después de la creación inicial de cada tabla.
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS high_chairs BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS high_chairs_count INT NOT NULL DEFAULT 0;
ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS is_kids BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMPTZ;
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS leader_phone VARCHAR(20);
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS slug VARCHAR(80);
ALTER TABLE events ADD COLUMN IF NOT EXISTS whatsapp_message TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);

-- 2.3) events.user_id: columna (BD legacy) + FK garantizada. La FK se añade solo
--      si no existe ya una FK sobre esa misma columna (sin importar su nombre).
ALTER TABLE events ADD COLUMN IF NOT EXISTS user_id INT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'events'::regclass
      AND c.contype = 'f'
      AND c.conkey = ARRAY[
        (SELECT a.attnum
           FROM pg_attribute a
          WHERE a.attrelid = 'events'::regclass
            AND a.attname = 'user_id'
            AND NOT a.attisdropped)
      ]::smallint[]
  ) THEN
    ALTER TABLE events ADD CONSTRAINT events_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2.4) events.user_id NOT NULL, igual que en BD nuevas. Solo se aplica cuando ya
--      no quedan huérfanos (el backfill de init.js los asigna en cada ejecución),
--      de modo que nunca falla ni fuerza cambios sobre datos existentes.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'events'
      AND column_name = 'user_id'
      AND is_nullable = 'YES'
  ) AND NOT EXISTS (SELECT 1 FROM events WHERE user_id IS NULL) THEN
    ALTER TABLE events ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- 2.5) Índices únicos parciales: permiten varios NULL, impiden duplicados.
--      slug: /invitacion/<slug>/<token>; custom_domain: dominio propio del evento.
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug ON events(slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_custom_domain ON events(custom_domain) WHERE custom_domain IS NOT NULL;

-- 2.6) Row Level Security (Supabase): activada en todas las tablas, sin políticas.
--      La app conecta como owner (bypass de RLS), así que no le afecta; es defensa
--      en profundidad para los roles anon/authenticated de Supabase. Idempotente.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE "groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE revoked_invitation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tables" ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
