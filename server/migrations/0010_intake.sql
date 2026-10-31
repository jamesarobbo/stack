CREATE TABLE intake_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  day TEXT NOT NULL,
  taken_at TEXT NOT NULL,
  UNIQUE (user_id, product_id, day)
);

CREATE INDEX intake_user_day ON intake_logs (user_id, day);
