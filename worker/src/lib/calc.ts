import type { ValuationResponse, NavRecord } from '../types';

/**
 * 保有口数と投資総額から評価額を計算する
 *
 * 基準価額は 10,000口あたりの価格なので:
 *   評価額 = 基準価額 × 保有口数 ÷ 10,000
 */
export function calculateValuation(
  nav: number,
  totalUnits: number,
  totalInvested: number,
  date: string
): ValuationResponse {
  // 基準価額は1万口あたりの価格
  const currentValue = Math.round((nav * totalUnits) / 10000);
  const profitLoss = currentValue - totalInvested;
  const profitLossPercent = totalInvested > 0
    ? Math.round((profitLoss / totalInvested) * 10000) / 100  // 小数点2桁
    : 0;

  return {
    date,
    nav,
    totalUnits,
    totalInvested,
    currentValue,
    profitLoss,
    profitLossPercent,
  };
}

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
