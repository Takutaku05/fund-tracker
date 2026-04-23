/**
 * アラートチェックロジック
 * watchlist ごとに下落率を判定し、通知すべきかを返す
 */

import type { Watchlist, AlertCheckResult } from '../types/alert';

export interface PriceData {
  currentPrice: number;
  baselinePrice: number; // window_hours 前の価格
}

/**
 * 指定 fund の現在価格と基準価格を nav_history から取得する
 */
export async function getPriceData(
  db: D1Database,
  fundId: string,
  windowHours: number
): Promise<PriceData | null> {
  const currentRow = await db.prepare(
    'SELECT nav FROM nav_history WHERE fund_id = ? ORDER BY date DESC LIMIT 1'
  ).bind(fundId).first<{ nav: number }>();

  if (!currentRow) return null;

  // windowHours を日数に換算（投信は日次データのため）
  const windowDays = Math.max(1, Math.ceil(windowHours / 24));

  const baselineRow = await db.prepare(
    `SELECT nav FROM nav_history
     WHERE fund_id = ? AND date <= date('now', ? || ' days')
     ORDER BY date DESC LIMIT 1`
  ).bind(fundId, `-${windowDays}`).first<{ nav: number }>();

  if (!baselineRow) return null;

  return {
    currentPrice: currentRow.nav,
    baselinePrice: baselineRow.nav,
  };
}

/**
 * 下落率を計算する
 */
export function calculateDropPct(baseline: number, current: number): number {
  if (baseline <= 0) return 0;
  return ((baseline - current) / baseline) * 100;
}

/**
 * クールダウン期間内かどうかを判定する
 */
export function isInCooldown(lastNotifiedAt: string | null, cooldownMinutes: number): boolean {
  if (!lastNotifiedAt) return false;

  const lastNotified = new Date(lastNotifiedAt + 'Z').getTime();
  const now = Date.now();
  const cooldownMs = cooldownMinutes * 60 * 1000;

  return (now - lastNotified) < cooldownMs;
}

/**
 * 単一の watchlist エントリについてアラート判定を行う
 */
export async function checkWatchlistAlert(
  db: D1Database,
  watchlist: Watchlist
): Promise<AlertCheckResult> {
  if (!watchlist.fund_id) {
    return {
      symbol: watchlist.symbol,
      dropPct: 0,
      baselinePrice: 0,
      currentPrice: 0,
      notified: false,
      reason: 'no_fund_mapping',
    };
  }

  const priceData = await getPriceData(db, watchlist.fund_id, watchlist.window_hours);

  if (!priceData) {
    return {
      symbol: watchlist.symbol,
      dropPct: 0,
      baselinePrice: 0,
      currentPrice: 0,
      notified: false,
      reason: 'no_price_data',
    };
  }

  const dropPct = calculateDropPct(priceData.baselinePrice, priceData.currentPrice);

  // しきい値未満
  if (dropPct < watchlist.drop_threshold_pct) {
    return {
      symbol: watchlist.symbol,
      dropPct,
      baselinePrice: priceData.baselinePrice,
      currentPrice: priceData.currentPrice,
      notified: false,
      reason: 'below_threshold',
    };
  }

  // クールダウン中
  if (isInCooldown(watchlist.last_notified_at, watchlist.cooldown_minutes)) {
    return {
      symbol: watchlist.symbol,
      dropPct,
      baselinePrice: priceData.baselinePrice,
      currentPrice: priceData.currentPrice,
      notified: false,
      reason: 'cooldown',
    };
  }

  // 通知対象
  return {
    symbol: watchlist.symbol,
    dropPct,
    baselinePrice: priceData.baselinePrice,
    currentPrice: priceData.currentPrice,
    notified: true,
  };
}
