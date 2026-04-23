import type { FundRow, FundMeta } from '../types';

/**
 * DB から銘柄行を取得する。enabled フラグは問わない（詳細ページ用）。
 */
export async function loadFund(db: D1Database, fundId: string): Promise<FundRow | null> {
  const row = await db.prepare('SELECT * FROM funds WHERE id = ?').bind(fundId).first<FundRow>();
  return row ?? null;
}

/**
 * 取得対象の銘柄一覧（cron 用）
 */
export async function loadEnabledFunds(db: D1Database): Promise<FundRow[]> {
  const res = await db
    .prepare('SELECT * FROM funds WHERE enabled = 1 ORDER BY id')
    .all<FundRow>();
  return res.results ?? [];
}

export function toFundMeta(row: FundRow): FundMeta {
  return {
    id: row.id,
    nameJa: row.name_ja,
    nameEn: row.name_en,
    isin: row.isin,
    currency: row.currency,
    unitLabel: row.unit_label,
  };
}
