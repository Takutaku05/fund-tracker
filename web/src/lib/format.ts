/**
 * 数値を日本円フォーマットに変換
 * @example formatCurrency(28534) => "¥28,534"
 */
export function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`;
}

/**
 * 数値をパーセントフォーマットに変換
 * @example formatPercent(2.45) => "+2.45%"
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * 数値を符号付き円フォーマットに変換
 * @example formatSignedCurrency(1500) => "+¥1,500"
 */
export function formatSignedCurrency(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}¥${Math.abs(value).toLocaleString('ja-JP')}`;
}

/**
 * 日付文字列を日本語フォーマットに変換
 * @example formatDate("2026-04-08") => "4月8日"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00+09:00');
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 日付文字列をフル日本語フォーマットに変換
 * @example formatFullDate("2026-04-08") => "2026年4月8日"
 */
export function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00+09:00');
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * チャート用の短い日付ラベル
 * @example formatChartDate("2026-04-08") => "4/8"
 */
export function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00+09:00');
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 純資産総額を読みやすい形式に変換
 * @example formatNetAsset(4812345) => "4.81兆円"
 */
export function formatNetAsset(millionYen: number): string {
  if (millionYen >= 1000000) {
    return `${(millionYen / 1000000).toFixed(2)}兆円`;
  }
  if (millionYen >= 10000) {
    return `${(millionYen / 10000).toFixed(0)}億円`;
  }
  return `${millionYen.toLocaleString('ja-JP')}百万円`;
}
