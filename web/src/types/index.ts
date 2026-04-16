/** API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Latest NAV data */
export interface LatestNavData {
  date: string;
  nav: number;
  netAsset: number | null;
  previousNav: number | null;
  change: number | null;
  changePercent: number | null;
}

/** All-time peak drawdown */
export interface AlltimePeakData {
  peak: number;
  peakDate: string;
  drawdown: number;
  drawdownPercent: number;
}

/** History record */
export interface NavHistoryRecord {
  date: string;
  nav: number;
  net_asset: number | null;
}

/** Drawdown from period peak */
export interface DrawdownResult {
  peak: number;
  peakDate: string;
  drawdown: number;
  drawdownPercent: number;
  trough: number;
  troughDate: string;
  gain: number;
  gainPercent: number;
}

/** Period options for chart */
export type Period = 'week' | 'month' | '3month' | '6month' | 'year' | 'all';

export interface PeriodOption {
  value: Period;
  label: string;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'week', label: '1W' },
  { value: 'month', label: '1M' },
  { value: '3month', label: '3M' },
  { value: '6month', label: '6M' },
  { value: 'year', label: '1Y' },
  { value: 'all', label: 'ALL' },
];

/** Watchlist item */
export interface WatchlistItem {
  id: string;
  symbol: string;
  displayName: string;
  enabled: boolean;
  dropThresholdPct: number;
  windowHours: number;
  cooldownMinutes: number;
  lastNotifiedAt: string | null;
}

export interface WatchlistInput {
  symbol: string;
  display_name: string;
  drop_threshold_pct?: number;
  window_hours?: number;
  cooldown_minutes?: number;
  enabled?: boolean;
}

/** Notification channel */
export interface NotificationChannelItem {
  id: string;
  type: string;
  enabled: boolean;
  lastTestedAt: string | null;
}

export interface NotificationChannelInput {
  webhook_url: string;
  type?: string;
  enabled?: boolean;
}
