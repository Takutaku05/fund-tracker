/**
 * アラートチェックロジック
 * watchlist ごとに下落率/上昇率を判定し、通知すべきかを返す
 */

import type { Watchlist, AlertCheckResult } from '../types/alert';

export interface PriceData {
  currentPrice: number;
  baselinePrice: number; // window_days 日前の価格
}

/**
 * 指定 fund の現在価格と基準価格を nav_history から取得する
 */
export async function getPriceData(
  db: D1Database,
  fundId: string,
  windowDays: number
): Promise<PriceData | null> {
  const currentRow = await db.prepare(
    'SELECT nav FROM nav_history WHERE fund_id = ? ORDER BY date DESC LIMIT 1'
  ).bind(fundId).first<{ nav: number }>();

  if (!currentRow) return null;

  const days = Math.max(1, Math.floor(windowDays));

  const baselineRow = await db.prepare(
    `SELECT nav FROM nav_history
     WHERE fund_id = ? AND date <= date('now', ? || ' days')
     ORDER BY date DESC LIMIT 1`
  ).bind(fundId, `-${days}`).first<{ nav: number }>();

  if (!baselineRow) return null;

  return {
    currentPrice: currentRow.nav,
    baselinePrice: baselineRow.nav,
  };
}

/**
 * 下落率を計算する (正の値なら下落)
 */
export function calculateDropPct(baseline: number, current: number): number {
  if (baseline <= 0) return 0;
  return ((baseline - current) / baseline) * 100;
}

/**
 * 上昇率を計算する (正の値なら上昇)
 */
export function calculateRisePct(baseline: number, current: number): number {
  if (baseline <= 0) return 0;
  return ((current - baseline) / baseline) * 100;
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
      triggerType: null,
      changePct: 0,
      baselinePrice: 0,
      currentPrice: 0,
      notified: false,
      reason: 'no_fund_mapping',
    };
  }

  const priceData = await getPriceData(db, watchlist.fund_id, watchlist.window_days);

  if (!priceData) {
    return {
      symbol: watchlist.symbol,
      triggerType: null,
      changePct: 0,
      baselinePrice: 0,
      currentPrice: 0,
      notified: false,
      reason: 'no_price_data',
    };
  }

  const dropPct = calculateDropPct(priceData.baselinePrice, priceData.currentPrice);
  const risePct = calculateRisePct(priceData.baselinePrice, priceData.currentPrice);

  const dropEnabled = watchlist.drop_threshold_pct > 0;
  const riseEnabled = watchlist.rise_threshold_pct > 0;
  const dropTriggered = dropEnabled && dropPct >= watchlist.drop_threshold_pct;
  const riseTriggered = riseEnabled && risePct >= watchlist.rise_threshold_pct;

  if (!dropTriggered && !riseTriggered) {
    return {
      symbol: watchlist.symbol,
      triggerType: null,
      changePct: dropPct >= 0 ? dropPct : risePct,
      baselinePrice: priceData.baselinePrice,
      currentPrice: priceData.currentPrice,
      notified: false,
      reason: 'below_threshold',
    };
  }

  // 下落と上昇は同時成立しないが、万一の場合は変化が大きい方を優先
  const useDrop = dropTriggered && (!riseTriggered || dropPct >= risePct);

  const triggerType = useDrop ? 'drop_threshold' : 'rise_threshold';
  const changePct = useDrop ? dropPct : risePct;

  // クールダウン中
  if (isInCooldown(watchlist.last_notified_at, watchlist.cooldown_minutes)) {
    return {
      symbol: watchlist.symbol,
      triggerType,
      changePct,
      baselinePrice: priceData.baselinePrice,
      currentPrice: priceData.currentPrice,
      notified: false,
      reason: 'cooldown',
    };
  }

  return {
    symbol: watchlist.symbol,
    triggerType,
    changePct,
    baselinePrice: priceData.baselinePrice,
    currentPrice: priceData.currentPrice,
    notified: true,
  };
}
