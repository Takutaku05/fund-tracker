/** Shared types for the worker */

export interface Env {
  DB: D1Database;
  FUND_CD: string;
  TOTAL_UNITS: string;
  TOTAL_INVESTED: string;
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

/** Portfolio valuation */
export interface ValuationResponse {
  date: string;
  nav: number;
  totalUnits: number;
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

/** History query params */
export interface HistoryQuery {
  period?: 'week' | 'month' | '3month' | '6month' | 'year' | 'all';
  from?: string;
  to?: string;
}
