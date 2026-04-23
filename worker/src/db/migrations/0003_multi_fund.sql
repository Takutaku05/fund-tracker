-- 0003_multi_fund.sql
-- 多銘柄対応: funds テーブルを追加し、nav_history に fund_id を付与する
-- 既存データは 'emaxis-ac' に backfill する

-- 1. funds テーブル新設
CREATE TABLE IF NOT EXISTS funds (
  id            TEXT PRIMARY KEY,
  name_ja       TEXT NOT NULL,
  name_en       TEXT,
  isin          TEXT,
  ticker        TEXT,
  data_source   TEXT NOT NULL,                   -- 'toushin_lib' 等（列挙）
  source_params TEXT NOT NULL DEFAULT '{}',      -- JSON: { isinCd, associFundCd, ... }
  currency      TEXT NOT NULL DEFAULT 'JPY',
  unit_label    TEXT DEFAULT '1万口',
  enabled       INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- 2. オルカンを seed
INSERT OR IGNORE INTO funds (id, name_ja, isin, data_source, source_params)
VALUES (
  'emaxis-ac',
  'eMAXIS Slim 全世界株式（オール・カントリー）',
  'JP90C000H1T1',
  'toushin_lib',
  '{"isinCd":"JP90C000H1T1","associFundCd":"0331418A"}'
);

-- 3. nav_history を再構築（PK: (fund_id, date)）
--    SQLite は PK 変更不可なのでテーブル作り直し。既存レコードは 'emaxis-ac' に backfill。
--    新規 DB（nav_history 未作成）でもエラーにならないよう、旧スキーマを IF NOT EXISTS で確保。

-- 旧テーブルが無い場合（新規 DB）は空テーブルとして作成。既存 DB では no-op。
CREATE TABLE IF NOT EXISTS nav_history (
  date       TEXT PRIMARY KEY,
  nav        INTEGER NOT NULL,
  net_asset  INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 新スキーマのテーブルを作成
CREATE TABLE nav_history_new (
  fund_id    TEXT NOT NULL,
  date       TEXT NOT NULL,
  nav        INTEGER NOT NULL,
  net_asset  INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (fund_id, date),
  FOREIGN KEY (fund_id) REFERENCES funds(id)
);

-- 既存データを backfill（新規 DB では 0 件）
INSERT INTO nav_history_new (fund_id, date, nav, net_asset, created_at)
SELECT 'emaxis-ac', date, nav, net_asset, created_at FROM nav_history;

DROP TABLE nav_history;
ALTER TABLE nav_history_new RENAME TO nav_history;
CREATE INDEX IF NOT EXISTS idx_nav_fund_date ON nav_history(fund_id, date DESC);

-- 4. watchlists に fund_id を追加（NULL 許容）。既存 EMAXIS_AC は emaxis-ac に紐付け。
ALTER TABLE watchlists ADD COLUMN fund_id TEXT REFERENCES funds(id);
UPDATE watchlists SET fund_id = 'emaxis-ac' WHERE symbol = 'EMAXIS_AC';
CREATE INDEX IF NOT EXISTS idx_watchlists_fund ON watchlists(fund_id);
