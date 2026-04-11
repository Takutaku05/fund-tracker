import type { NavRecord } from '../types';

/**
 * 前日比を計算する
 */
export function calculateChange(
  current: NavRecord,
  previous: NavRecord | null
): { change: number | null; changePercent: number | null } {
  if (!previous) {
    return { change: null, changePercent: null };
  }

  const change = current.nav - previous.nav;
  const changePercent = Math.round((change / previous.nav) * 10000) / 100;

  return { change, changePercent };
}
