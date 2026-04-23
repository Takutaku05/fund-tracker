import type { ParsedNavRow } from '../types';

// 投資信託協会 投信総合検索ライブラリー CSV API
const TOUSHIN_CSV_BASE = 'https://toushin-lib.fwg.ne.jp/FdsWeb/FDST030000/csv-file-download';

export interface ToushinLibParams {
  isinCd: string;
  associFundCd: string;
}

/**
 * 投信総合検索ライブラリーから基準価額 CSV を取得してパースする
 *
 * CSV フォーマット（Shift-JIS）:
 *   年月日,基準価額(円),純資産総額（百万円）,分配金,決算期
 *   2018年10月31日,10000,10,,
 */
export async function fetchNavFromToushinLib(params: ToushinLibParams): Promise<ParsedNavRow[]> {
  const url = `${TOUSHIN_CSV_BASE}?isinCd=${encodeURIComponent(params.isinCd)}&associFundCd=${encodeURIComponent(params.associFundCd)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`toushin-lib CSV fetch failed: ${res.status} ${res.statusText}`);
  }

  const buffer = await res.arrayBuffer();
  const text = new TextDecoder('shift-jis').decode(buffer);

  return parseToushinCsv(text);
}

function parseToushinCsv(text: string): ParsedNavRow[] {
  const lines = text.trim().split('\n');
  const rows: ParsedNavRow[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // ヘッダー行をスキップ（数字で始まらない行）
    if (!/^\d/.test(trimmed)) continue;

    const cols = trimmed.split(',');
    if (cols.length < 2) continue;

    // "2018年10月31日" → "2018-10-31"
    const rawDate = cols[0].trim();
    const date = rawDate
      .replace(/年/, '-')
      .replace(/月/, '-')
      .replace(/日/, '');

    const nav = parseInt(cols[1].trim(), 10);
    if (isNaN(nav)) continue;

    const netAsset = parseInt(cols[2]?.trim() ?? '', 10);
    const dividend = parseInt(cols[3]?.trim() ?? '', 10);

    rows.push({
      date,
      nav,
      netAsset: isNaN(netAsset) ? 0 : netAsset,
      dividend: isNaN(dividend) ? 0 : dividend,
    });
  }

  // 日付降順でソート（新しい日付が先頭）
  rows.sort((a, b) => b.date.localeCompare(a.date));

  return rows;
}
