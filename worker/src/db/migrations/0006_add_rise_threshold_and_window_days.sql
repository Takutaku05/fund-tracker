-- 0006_add_rise_threshold_and_window_days.sql
-- 比較期間を「時間」から「日」に変更し、上昇率アラートを追加する。
-- 既存の window_hours 列は保持するが、以後は参照しない（ロールバック容易化のため）。

ALTER TABLE watchlists ADD COLUMN window_days INTEGER NOT NULL DEFAULT 1;
ALTER TABLE watchlists ADD COLUMN rise_threshold_pct REAL NOT NULL DEFAULT 0.0;

-- 既存の window_hours から切り上げで window_days を算出して backfill
-- 例: 24h → 1日, 48h → 2日, 36h → 2日
UPDATE watchlists
   SET window_days = CASE
     WHEN window_hours <= 0 THEN 1
     ELSE (window_hours + 23) / 24
   END;
