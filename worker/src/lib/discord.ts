/**
 * Discord Webhook 通知送信ユーティリティ
 */

export interface DiscordAlertPayload {
  symbol: string;
  displayName: string;
  dropPct: number;
  baselinePrice: number;
  currentPrice: number;
  windowHours: number;
}

/**
 * 下落アラートのDiscordメッセージを組み立てる
 */
function buildAlertMessage(payload: DiscordAlertPayload): object {
  const { symbol, displayName, dropPct, baselinePrice, currentPrice, windowHours } = payload;

  const periodLabel = windowHours >= 24
    ? `${Math.round(windowHours / 24)}日間`
    : `${windowHours}時間`;

  return {
    embeds: [
      {
        title: `📉 ${displayName} が ${dropPct.toFixed(2)}% 下落`,
        color: 0xff4444, // 赤
        fields: [
          { name: '銘柄', value: symbol, inline: true },
          { name: '比較期間', value: periodLabel, inline: true },
          { name: '基準価格', value: baselinePrice.toLocaleString(), inline: true },
          { name: '現在価格', value: currentPrice.toLocaleString(), inline: true },
          { name: '下落率', value: `${dropPct.toFixed(2)}%`, inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'Fund Tracker Alert' },
      },
    ],
  };
}

/**
 * Discord Webhook にアラートを送信する
 * @returns 成功時 null、失敗時エラーメッセージ
 */
export async function sendDiscordAlert(
  webhookUrl: string,
  payload: DiscordAlertPayload
): Promise<string | null> {
  const body = buildAlertMessage(payload);

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return `Discord API ${response.status}: ${errorText}`;
  }

  return null;
}
