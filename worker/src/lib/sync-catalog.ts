import { FUND_CATALOG } from '../config/fund-catalog';

/**
 * FUND_CATALOG を funds テーブルに同期する。
 * - カタログにある銘柄: INSERT or UPDATE（enabled も含めて上書き）
 * - カタログから消えた銘柄: enabled=0 に落とす（物理削除はしない）
 * 全ステートメントを batch でまとめて投げるため原子的に反映される。
 */
export async function syncCatalogToDb(db: D1Database): Promise<void> {
  const upsertStmts = FUND_CATALOG.map((fund) =>
    db
      .prepare(
        `INSERT INTO funds (id, name_ja, name_en, isin, ticker, data_source, source_params, currency, unit_label, enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name_ja       = excluded.name_ja,
           name_en       = excluded.name_en,
           isin          = excluded.isin,
           ticker        = excluded.ticker,
           data_source   = excluded.data_source,
           source_params = excluded.source_params,
           currency      = excluded.currency,
           unit_label    = excluded.unit_label,
           enabled       = excluded.enabled`
      )
      .bind(
        fund.id,
        fund.nameJa,
        fund.nameEn ?? null,
        fund.isin ?? null,
        fund.ticker ?? null,
        fund.dataSource,
        JSON.stringify(fund.sourceParams),
        fund.currency ?? 'JPY',
        fund.unitLabel ?? '1万口',
        fund.enabled === false ? 0 : 1
      )
  );

  // カタログに無い銘柄は enabled=0（soft-disable）
  const catalogIds = FUND_CATALOG.map((f) => f.id);
  const placeholders = catalogIds.map(() => '?').join(',');
  const disableStmt =
    catalogIds.length > 0
      ? db
          .prepare(`UPDATE funds SET enabled = 0 WHERE id NOT IN (${placeholders})`)
          .bind(...catalogIds)
      : db.prepare('UPDATE funds SET enabled = 0');

  await db.batch([...upsertStmts, disableStmt]);

  console.log(`[sync-catalog] synced ${FUND_CATALOG.length} funds`);
}
