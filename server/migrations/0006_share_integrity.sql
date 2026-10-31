-- Versioned shares, retained copies, validated copier results, moderation, and rate limits.

-- One live share per person. Older duplicates are revoked before the unique index is created.
UPDATE shares SET revoked_at = updated_at
WHERE revoked_at IS NULL
  AND id NOT IN (
    SELECT (
      SELECT t.id FROM shares t
      WHERE t.user_id = s.user_id AND t.revoked_at IS NULL
      ORDER BY t.updated_at DESC, t.id DESC
      LIMIT 1
    )
    FROM shares s
    WHERE s.revoked_at IS NULL
  );
CREATE UNIQUE INDEX idx_shares_one_active ON shares(user_id) WHERE revoked_at IS NULL;

-- listed replaces public_index. A listed share is indexable; a link-only share is not.
UPDATE shares SET listed = 1 WHERE public_index = 1;
ALTER TABLE shares DROP COLUMN public_index;

ALTER TABLE shares ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
-- The version where the current ingredients and doses began. Copies and results of older formulations do not count.
ALTER TABLE shares ADD COLUMN material_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE shares ADD COLUMN discover_ok INTEGER NOT NULL DEFAULT 1;
ALTER TABLE shares ADD COLUMN hidden_at TEXT;
ALTER TABLE shares ADD COLUMN review_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE shares ADD COLUMN kept_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE shares ADD COLUMN kept_recent INTEGER NOT NULL DEFAULT 0;
-- Small JSON for Discover cards: product count, score reasons, and a composition strip.
ALTER TABLE shares ADD COLUMN card TEXT NOT NULL DEFAULT '{}';

CREATE TABLE share_versions (
  share_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  material_version INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  changes TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  PRIMARY KEY (share_id, version)
);
INSERT INTO share_versions (share_id, version, material_version, snapshot, changes, created_at)
  SELECT id, 1, 1, snapshot, '[]', updated_at FROM shares;

ALTER TABLE share_copies ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE share_copies ADD COLUMN material_version INTEGER NOT NULL DEFAULT 1;
-- 1 while at least one copied product is still in the copier's synced stack.
ALTER TABLE share_copies ADD COLUMN in_stack INTEGER NOT NULL DEFAULT 1;
ALTER TABLE share_copies ADD COLUMN checked_at TEXT;
ALTER TABLE share_copies ADD COLUMN account_age_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE share_copies ADD COLUMN outcome_consent INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_share_copies_share_time ON share_copies(share_id, copied_at);
CREATE INDEX idx_share_copies_user ON share_copies(user_id);

-- Results were client samples with a client start date. They cannot be validated, so they are not kept.
DROP TABLE share_outcomes;

CREATE TABLE copier_outcomes (
  share_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  material_version INTEGER NOT NULL,
  metric TEXT NOT NULL,
  percent_change INTEGER NOT NULL,
  within_normal INTEGER NOT NULL,
  window_days INTEGER NOT NULL,
  device TEXT NOT NULL,
  age_range TEXT NOT NULL,
  sex TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  PRIMARY KEY (share_id, user_id, metric)
);
CREATE INDEX idx_copier_outcomes_share ON copier_outcomes(share_id, material_version, submitted_at);
CREATE INDEX idx_copier_outcomes_cohort ON copier_outcomes(age_range, sex, window_days);

CREATE TABLE share_cohort_cache (
  share_id TEXT NOT NULL,
  material_version INTEGER NOT NULL,
  day TEXT NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY (share_id, material_version)
);

-- Saves survive unlisting. Queries hide saves of shares that are not listed.
CREATE INDEX idx_share_saves_user_time ON share_saves(user_id, created_at);

ALTER TABLE share_reports ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE share_reports ADD COLUMN resolved_at TEXT;
CREATE INDEX idx_share_reports_share ON share_reports(share_id, resolved_at);

CREATE TABLE user_blocks (
  user_id TEXT NOT NULL,
  blocked_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, blocked_user_id)
);

CREATE TABLE moderation_log (
  id TEXT PRIMARY KEY,
  share_id TEXT NOT NULL,
  action TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_moderation_log_share ON moderation_log(share_id, created_at);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);

ALTER TABLE email_codes ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;

-- Deferred deep link. A keyed hash of the address, never the address itself. Rows live for 2 hours.
CREATE TABLE pending_links (
  ip_hash TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE share_images (
  share_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  png BLOB NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (share_id, version)
);

CREATE TABLE app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX idx_off_cache_fetched ON off_cache(fetched_at);
