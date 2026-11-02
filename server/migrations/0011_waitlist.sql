-- Landing page waitlist. Apply remotely only after a D1 backup and James's approval.
CREATE TABLE waitlist (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  created_at TEXT NOT NULL,
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  UNIQUE (email)
);

CREATE INDEX waitlist_created ON waitlist (created_at);
