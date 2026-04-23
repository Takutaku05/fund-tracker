-- funds: 対応銘柄マスタ
CREATE TABLE IF NOT EXISTS funds (
  id            TEXT PRIMARY KEY,
  name_ja       TEXT NOT NULL,
  name_en       TEXT,
  isin          TEXT,
  ticker        TEXT,
  data_source   TEXT NOT NULL,                   -- 'toushin_lib' 等（列挙）
  source_params TEXT NOT NULL DEFAULT '{}',      -- JSON
  currency      TEXT NOT NULL DEFAULT 'JPY',
  unit_label    TEXT DEFAULT '1万口',
  enabled       INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- nav_history: 基準価額の時系列（銘柄 × 日付）
CREATE TABLE IF NOT EXISTS nav_history (
  fund_id    TEXT NOT NULL,
  date       TEXT NOT NULL,                      -- YYYY-MM-DD
  nav        INTEGER NOT NULL,                   -- 基準価額（円）
  net_asset  INTEGER,                            -- 純資産総額（百万円）
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (fund_id, date),
  FOREIGN KEY (fund_id) REFERENCES funds(id)
);

CREATE INDEX IF NOT EXISTS idx_nav_fund_date ON nav_history(fund_id, date DESC);
