CREATE TABLE dsld_cache (
  cache_key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);

CREATE TABLE dsld_budget (
  hour_key TEXT PRIMARY KEY,
  requests INTEGER NOT NULL
);

CREATE TABLE contributed_labels (
  user_id TEXT NOT NULL,
  upc TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, upc)
);
