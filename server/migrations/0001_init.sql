CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  apple_sub TEXT UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE email_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE subscriptions (
  user_id TEXT PRIMARY KEY,
  entitlement TEXT NOT NULL,
  status TEXT NOT NULL,
  product_id TEXT,
  store TEXT,
  expires_at TEXT,
  revenuecat_app_user_id TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE synced_stacks (
  user_id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_email_codes_email ON email_codes(email, created_at);
