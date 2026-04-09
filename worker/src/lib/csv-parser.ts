import type { ParsedNavRow } from '../types';

/**
 * Shift_JIS CSV をパースして NavRow 配列を返す
 *
 * CSV format (eMAXIS):
 *   年月日,基準価額,純資産総額(百万円),分配金,決算期
 *   2026/04/08,28534,4812345,0,
 */
export function parseCsv(text: string): ParsedNavRow[] {
  const lines = text.trim().split('\n');
  const rows: ParsedNavRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // ヘッダー行をスキップ（数字で始まらない行）
    if (!/^\d/.test(line)) continue;

    const cols = line.split(',');
    if (cols.length < 4) continue;

    const rawDate = cols[0].trim();   // 2026/04/08
    const rawNav = cols[1].trim();
    const rawNetAsset = cols[2].trim();
    const rawDividend = cols[3].trim();

    // 日付を YYYY-MM-DD に正規化
    const date = rawDate.replace(/\//g, '-');
    const nav = parseInt(rawNav, 10);
    const netAsset = parseInt(rawNetAsset, 10);
    const dividend = parseInt(rawDividend, 10);

    if (isNaN(nav)) continue;

    rows.push({
      date,
      nav,
      netAsset: isNaN(netAsset) ? 0 : netAsset,
      dividend: isNaN(dividend) ? 0 : dividend,
    });
  }

  return rows;
}
