import type { NavHistoryRecord } from '../types';

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

export function calculateDrawdown(
  history: NavHistoryRecord[],
  currentNav: number
): DrawdownResult | null {
  if (history.length === 0) return null;
  const peakRecord = history.reduce(
    (max, r) => (r.nav > max.nav ? r : max),
    history[0]
  );
  const troughRecord = history.reduce(
    (min, r) => (r.nav < min.nav ? r : min),
    history[0]
  );
  const drawdown = currentNav - peakRecord.nav;
  const drawdownPercent =
    Math.round((drawdown / peakRecord.nav) * 10000) / 100;
  const gain = currentNav - troughRecord.nav;
  const gainPercent =
    Math.round((gain / troughRecord.nav) * 10000) / 100;
  return {
    peak: peakRecord.nav,
    peakDate: peakRecord.date,
    drawdown,
    drawdownPercent,
    trough: troughRecord.nav,
    troughDate: troughRecord.date,
    gain,
    gainPercent,
  };
}
