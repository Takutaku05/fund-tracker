-- 0002_add_sessions.sql
-- セッション管理テーブル（Cookie ベース認証用）

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,          -- セッショントークン (UUID)
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,             -- 有効期限 (ISO 8601)
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
