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

/** Portfolio valuation */
export interface ValuationData {
  date: string;
  nav: number;
  totalUnits: number;
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

/** History record */
export interface NavHistoryRecord {
  date: string;
  nav: number;
  net_asset: number | null;
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
