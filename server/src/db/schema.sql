-- Esquema PostgreSQL de DisplayEvent.
-- Destinado a Supabase (Postgres). No usa CREATE DATABASE: se ejecuta sobre la base ya creada.

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_event ON "groups"(event_id);
CREATE INDEX IF NOT EXISTS idx_group_token ON "groups"(invitation_token);

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