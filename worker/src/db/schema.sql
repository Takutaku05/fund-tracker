CREATE TABLE IF NOT EXISTS nav_history (
  date       TEXT PRIMARY KEY,   -- YYYY-MM-DD format
  nav        INTEGER NOT NULL,   -- 基準価額（円）
  net_asset  INTEGER,            -- 純資産総額（百万円）
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nav_date ON nav_history(date DESC);
