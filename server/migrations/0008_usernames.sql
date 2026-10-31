ALTER TABLE users ADD COLUMN username TEXT;
CREATE UNIQUE INDEX idx_users_username ON users(username COLLATE NOCASE);

-- Real names were stored on shares. Clear them until a username is chosen.
UPDATE shares SET creator_name = '' WHERE creator_name != '';
DELETE FROM share_search;
INSERT INTO share_search(share_id, stack_name, creator_name, goals, ingredients)
SELECT id, stack_name, creator_name, goals, ingredients
FROM shares
WHERE listed = 1 AND discover_ok = 1 AND hidden_at IS NULL AND revoked_at IS NULL;
