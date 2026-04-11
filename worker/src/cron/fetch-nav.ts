import type { Env } from '../types';
import { fetchNavFromEmaxis } from '../lib/emaxis';

/**
 * Cron Trigger ハンドラ
 * 毎日 18:00 JST (09:00 UTC) に実行され、eMAXIS CSV API から基準価額を取得して D1 に保存する
 */
export async function handleCronFetchNav(env: Env): Promise<void> {
  console.log('[cron] Starting NAV fetch...');

  try {
    const fundCd = env.FUND_CD || '253425';
    const rows = await fetchNavFromEmaxis(fundCd);

    console.log(`[cron] Fetched ${rows.length} rows from eMAXIS`);

    // 全件 UPSERT（重複を防ぐ）
    let inserted = 0;

    for (const row of rows) {
      const result = await env.DB.prepare(
        `INSERT INTO nav_history (date, nav, net_asset)
         VALUES (?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET
           nav = excluded.nav,
           net_asset = excluded.net_asset`
      )
        .bind(row.date, row.nav, row.netAsset)
        .run();

      if (result.meta.changes > 0) {
        inserted++;
      }
    }

    console.log(`[cron] Upserted ${inserted} rows into D1`);
  } catch (error) {
    console.error('[cron] Failed to fetch NAV:', error);
    throw error;
  }
}
