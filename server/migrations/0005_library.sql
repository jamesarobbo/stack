ALTER TABLE shares ADD COLUMN listed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE shares ADD COLUMN stack_name TEXT NOT NULL DEFAULT '';
ALTER TABLE shares ADD COLUMN creator_name TEXT NOT NULL DEFAULT '';
ALTER TABLE shares ADD COLUMN goals TEXT NOT NULL DEFAULT '';
ALTER TABLE shares ADD COLUMN ingredients TEXT NOT NULL DEFAULT '';
ALTER TABLE shares ADD COLUMN audit_score INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_shares_listed_created ON shares(listed, created_at);
CREATE INDEX idx_share_copies_time ON share_copies(copied_at);

CREATE TABLE share_saves (
  share_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (share_id, user_id)
);

CREATE TABLE share_reports (
  share_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (share_id, user_id)
);

CREATE VIRTUAL TABLE share_search USING fts5(
  share_id UNINDEXED,
  stack_name,
  creator_name,
  goals,
  ingredients,
  tokenize = 'unicode61'
);
