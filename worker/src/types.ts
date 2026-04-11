/** Shared types for the worker */

export interface Env {
  DB: D1Database;
  FUND_CD: string;
  ENCRYPTION_KEY: string;       // Webhook URL暗号化用（Cloudflare Secret）
  GOOGLE_CLIENT_ID: string;     // Google OAuth Client ID
  GOOGLE_CLIENT_SECRET: string; // Google OAuth Client Secret（Cloudflare Secret）
  APP_BASE_URL: string;         // アプリのベースURL（例: https://fund-tracker.example.com）
  PRICE_API_KEY?: string;       // 外部価格API用（必要に応じて）
}

/** A single NAV record from D1 */
export interface NavRecord {
  date: string;
  nav: number;
  net_asset: number | null;
  created_at: string;
}

/** Parsed row from eMAXIS CSV */
export interface ParsedNavRow {
  date: string;       // YYYY-MM-DD
  nav: number;        // 基準価額
  netAsset: number;   // 純資産総額（百万円）
  dividend: number;   // 分配金
}

/** API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Latest NAV API response */
export interface LatestNavResponse {
  date: string;
  nav: number;
  netAsset: number | null;
  previousNav: number | null;
  change: number | null;
  changePercent: number | null;
}

/** All-time peak drawdown */
export interface AlltimePeakResponse {
  peak: number;
  peakDate: string;
  drawdown: number;
  drawdownPercent: number;
}

/** History query params */
export interface HistoryQuery {
  period?: 'week' | 'month' | '3month' | '6month' | 'year' | 'all';
  from?: string;
  to?: string;
}
