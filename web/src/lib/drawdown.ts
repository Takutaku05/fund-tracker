import type { NavHistoryRecord } from '../types';

export interface DrawdownResult {
  peak: number;
  peakDate: string;
  drawdown: number;
  drawdownPercent: number;
}

export function calculateDrawdown(
  history: NavHistoryRecord[],
  currentNav: number
): DrawdownResult | null {
  if (history.length === 0) return null;
  const peakRecord = history.reduce(
    (max, r) => (r.nav > max.nav ? r : max),
    history[0]
  );
  const drawdown = currentNav - peakRecord.nav;
  const drawdownPercent =
    Math.round((drawdown / peakRecord.nav) * 10000) / 100;
  return {
    peak: peakRecord.nav,
    peakDate: peakRecord.date,
    drawdown,
    drawdownPercent,
  };
}
