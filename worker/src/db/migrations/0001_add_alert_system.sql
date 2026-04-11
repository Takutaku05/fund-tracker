-- 0001_add_alert_system.sql
-- マルチユーザー対応のアラート通知システム

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  auth_provider TEXT NOT NULL,          -- 'github', 'google' など
  auth_subject  TEXT NOT NULL,          -- provider側の一意ID
  email         TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(auth_provider, auth_subject)
);

-- 監視銘柄テーブル
CREATE TABLE IF NOT EXISTS watchlists (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol            TEXT NOT NULL,       -- 例: 'EMAXIS_AC', 'AAPL', 'BTC-USD'
  display_name      TEXT NOT NULL,       -- 表示名
  enabled           INTEGER NOT NULL DEFAULT 1,
  drop_threshold_pct REAL NOT NULL DEFAULT 5.0,   -- 下落率しきい値(%)
  window_hours      INTEGER NOT NULL DEFAULT 24,  -- 比較期間(時間)
  cooldown_minutes  INTEGER NOT NULL DEFAULT 180,  -- 再通知抑制(分)
  last_notified_at  TEXT,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, symbol)
);
CREATE INDEX IF NOT EXISTS idx_watchlists_user_enabled ON watchlists(user_id, enabled);

-- 通知チャンネルテーブル
CREATE TABLE IF NOT EXISTS notification_channels (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type             TEXT NOT NULL DEFAULT 'discord_webhook',  -- 将来 slack_webhook 等も
  webhook_encrypted TEXT NOT NULL,       -- 暗号化済みWebhook URL
  enabled          INTEGER NOT NULL DEFAULT 1,
  last_tested_at   TEXT,
  created_at       TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notif_channels_user_enabled ON notification_channels(user_id, enabled);

-- 価格スナップショット（比較基準・分析用）
CREATE TABLE IF NOT EXISTS price_snapshots (
  id          TEXT PRIMARY KEY,
  symbol      TEXT NOT NULL,
  price       REAL NOT NULL,
  captured_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_symbol_time ON price_snapshots(symbol, captured_at DESC);

-- アラートイベント（監査・重複防止）
CREATE TABLE IF NOT EXISTS alert_events (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  watchlist_id    TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol          TEXT NOT NULL,
  trigger_type    TEXT NOT NULL DEFAULT 'drop_threshold',
  drop_pct        REAL NOT NULL,
  baseline_price  REAL NOT NULL,
  current_price   REAL NOT NULL,
  sent_at         TEXT NOT NULL DEFAULT (datetime('now')),
  delivery_status TEXT NOT NULL DEFAULT 'sent',  -- 'sent', 'failed'
  delivery_error  TEXT
);
CREATE INDEX IF NOT EXISTS idx_alert_events_user_symbol_time ON alert_events(user_id, symbol, sent_at DESC);
