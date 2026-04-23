/** Alert system types — maps to D1 tables from 0001_add_alert_system.sql */

// ---------- DB row types ----------

export interface User {
  id: string;
  auth_provider: string;
  auth_subject: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Watchlist {
  id: string;
  user_id: string;
  symbol: string;
  display_name: string;
  enabled: number; // D1 stores boolean as 0/1
  drop_threshold_pct: number;
  window_hours: number;
  cooldown_minutes: number;
  last_notified_at: string | null;
  fund_id: string | null; // 紐付く銘柄（funds.id）。NULL の場合は価格データなし扱い
  created_at: string;
  updated_at: string;
}

export interface NotificationChannel {
  id: string;
  user_id: string;
  type: 'discord_webhook';
  webhook_encrypted: string;
  enabled: number;
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceSnapshot {
  id: string;
  symbol: string;
  price: number;
  captured_at: string;
}

export interface AlertEvent {
  id: string;
  user_id: string;
  watchlist_id: string;
  symbol: string;
  trigger_type: 'drop_threshold';
  drop_pct: number;
  baseline_price: number;
  current_price: number;
  sent_at: string;
  delivery_status: 'sent' | 'failed';
  delivery_error: string | null;
}

// ---------- API request/response types ----------

export interface WatchlistInput {
  symbol: string;
  display_name: string;
  fund_id?: string;
  drop_threshold_pct?: number;
  window_hours?: number;
  cooldown_minutes?: number;
  enabled?: boolean;
}

export interface WatchlistResponse {
  id: string;
  symbol: string;
  displayName: string;
  fundId: string | null;
  enabled: boolean;
  dropThresholdPct: number;
  windowHours: number;
  cooldownMinutes: number;
  lastNotifiedAt: string | null;
}

export interface NotificationChannelInput {
  type?: 'discord_webhook';
  webhook_url: string; // 平文で受け取り、暗号化して保存
  enabled?: boolean;
}

export interface NotificationChannelResponse {
  id: string;
  type: string;
  enabled: boolean;
  lastTestedAt: string | null;
  // webhook_url は返さない（セキュリティ）
}

export interface AlertCheckResult {
  symbol: string;
  dropPct: number;
  baselinePrice: number;
  currentPrice: number;
  notified: boolean;
  reason?: string; // 'cooldown', 'below_threshold', 'no_channel' など
}
