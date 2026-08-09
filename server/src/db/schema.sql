CREATE DATABASE IF NOT EXISTS displayevent
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE displayevent;

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  place VARCHAR(255) NOT NULL,
  invitation JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `groups` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  leader_name VARCHAR(255) NULL,
  invitation_token VARCHAR(16) NULL,
  rsvp_note VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_group_event FOREIGN KEY (event_id)
    REFERENCES events(id) ON DELETE CASCADE,
  UNIQUE INDEX uq_groups_token (invitation_token),
  INDEX idx_group_event (event_id)
);

CREATE TABLE IF NOT EXISTS `tables` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  capacity INT NOT NULL DEFAULT 8,
  shape ENUM('circle', 'square', 'rect') NOT NULL DEFAULT 'circle',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_table_event FOREIGN KEY (event_id)
    REFERENCES events(id) ON DELETE CASCADE,
  INDEX idx_table_event (event_id)
);

CREATE TABLE IF NOT EXISTS guests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_child TINYINT(1) NOT NULL DEFAULT 0,
  is_leader TINYINT(1) NOT NULL DEFAULT 0,
  registered TINYINT(1) NOT NULL DEFAULT 0,
  declined TINYINT(1) NOT NULL DEFAULT 0,
  table_id INT NULL,
  companion_of INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_guest_group FOREIGN KEY (group_id)
    REFERENCES `groups`(id) ON DELETE CASCADE,
  CONSTRAINT fk_guest_table FOREIGN KEY (table_id)
    REFERENCES `tables`(id) ON DELETE SET NULL,
  CONSTRAINT fk_guest_companion FOREIGN KEY (companion_id)
    REFERENCES guests(id) ON DELETE CASCADE,
  INDEX idx_guest_group (group_id),
  INDEX idx_guest_table (table_id),
  INDEX idx_guest_companion (companion_id)
);