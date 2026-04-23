/** Shared types for the worker */

export interface Env {
  DB: D1Database;
  DEFAULT_FUND_ID: string;      // 銘柄未指定時のフォールバック（例: 'emaxis-ac'）
  ENCRYPTION_KEY: string;       // Webhook URL暗号化用（Cloudflare Secret）
  GOOGLE_CLIENT_ID: string;     // Google OAuth Client ID
  GOOGLE_CLIENT_SECRET: string; // Google OAuth Client Secret（Cloudflare Secret）
  APP_BASE_URL: string;         // Worker自身のベースURL（OAuth redirect_uri用）
  FRONTEND_URL: string;         // フロントエンド（Pages）のURL（ログイン後リダイレクト用）
  PRICE_API_KEY?: string;       // 外部価格API用（必要に応じて）
}

// 新しいデータソースを追加する場合:
// 1. ここに union を追加（例: | 'yahoo_finance'）
// 2. worker/src/lib/fund-fetcher.ts の switch に case を追加
// 3. 対応する fetcher 関数を worker/src/lib/ に作成
export type FundDataSource = 'toushin_lib';

/** funds テーブルの行 */
export interface FundRow {
  id: string;
  name_ja: string;
  name_en: string | null;
  isin: string | null;
  ticker: string | null;
  data_source: FundDataSource;
  source_params: string;  // JSON 文字列
  currency: string;
  unit_label: string | null;
  enabled: number;
  created_at: string;
}

/** API レスポンスで返す銘柄メタ情報 */
export interface FundMeta {
  id: string;
  nameJa: string;
  nameEn: string | null;
  isin: string | null;
  currency: string;
  unitLabel: string | null;
}

/** A single NAV record from D1 */
export interface NavRecord {
  date: string;
  nav: number;
  net_asset: number | null;
  created_at: string;
}

/** Parsed row from fund data source (CSV 等) */
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
  fund: FundMeta;
  date: string;
  nav: number;
  netAsset: number | null;
  previousNav: number | null;
  change: number | null;
  changePercent: number | null;
}

/** All-time peak drawdown */
export interface AlltimePeakResponse {
  fund: FundMeta;
  peak: number;
  peakDate: string;
  drawdown: number;
  drawdownPercent: number;
}

/** History API response */
export interface HistoryResponse {
  fund: FundMeta;
  rows: NavRecord[];
}

/** History query params */
export interface HistoryQuery {
  period?: 'week' | 'month' | '3month' | '6month' | 'year' | 'all';
  from?: string;
  to?: string;
}
