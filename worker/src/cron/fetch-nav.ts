import type { Env } from '../types';
import { fetchNavForFund } from '../lib/fund-fetcher';
import { loadEnabledFunds } from '../lib/funds';
import { syncCatalogToDb } from '../lib/sync-catalog';

/**
 * Cron Trigger ハンドラ
 * 毎日 03:00 JST (18:00 UTC) に実行され、有効な全銘柄の基準価額を取得して D1 に保存する
 */
export async function handleCronFetchNav(env: Env): Promise<void> {
  console.log('[cron] Starting NAV fetch...');

  try {
    await syncCatalogToDb(env.DB);
  } catch (error) {
    // sync が失敗しても既存銘柄の NAV 取得は続行する
    console.error('[cron] syncCatalogToDb failed, continuing with existing funds:', error);
  }

  const funds = await loadEnabledFunds(env.DB);
  if (funds.length === 0) {
    console.warn('[cron] No enabled funds found — nothing to fetch');
    return;
  }

  const BATCH_SIZE = 100;

  for (const fund of funds) {
    try {
      const rows = await fetchNavForFund(fund);
      console.log(`[cron] fund=${fund.id} fetched ${rows.length} rows`);

      let inserted = 0;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const chunk = rows.slice(i, i + BATCH_SIZE);
        const stmts = chunk.map(row =>
          env.DB.prepare(
            `INSERT INTO nav_history (fund_id, date, nav, net_asset)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(fund_id, date) DO UPDATE SET
               nav = excluded.nav,
               net_asset = excluded.net_asset`
          ).bind(fund.id, row.date, row.nav, row.netAsset)
        );
        const results = await env.DB.batch(stmts);
        inserted += results.reduce((sum, r) => sum + (r.meta.changes ?? 0), 0);
      }

      console.log(`[cron] fund=${fund.id} upserted ${inserted} rows`);
    } catch (error) {
      console.error(`[cron] fund=${fund.id} fetch failed:`, error);
      // 1銘柄失敗しても他銘柄は継続
    }
  }
}
