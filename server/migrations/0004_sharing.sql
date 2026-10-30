ALTER TABLE users ADD COLUMN age_range TEXT;
ALTER TABLE users ADD COLUMN sex TEXT;
ALTER TABLE users ADD COLUMN display_name TEXT;

CREATE TABLE shares (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  snapshot TEXT NOT NULL,
  public_index INTEGER NOT NULL DEFAULT 0,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_shares_user ON shares(user_id);

CREATE TABLE share_copies (
  share_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  copied_at TEXT NOT NULL,
  PRIMARY KEY (share_id, user_id)
);

CREATE TABLE share_outcomes (
  share_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  percent_change REAL NOT NULL,
  window_days INTEGER NOT NULL,
  device TEXT NOT NULL,
  age_range TEXT NOT NULL,
  sex TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (share_id, user_id)
);
