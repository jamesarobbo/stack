-- One row per viewer per share per UTC day. viewer_key is "user:<id>" or "ip:<hash>".
CREATE TABLE share_views (
  share_id TEXT NOT NULL,
  viewer_key TEXT NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY (share_id, viewer_key, day)
);

CREATE INDEX idx_share_views_share ON share_views(share_id);
