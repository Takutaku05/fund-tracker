/**
 * Discord Webhook 通知送信ユーティリティ
 */

import type { AlertTriggerType } from '../types/alert';

export interface DiscordAlertPayload {
  symbol: string;
  displayName: string;
  triggerType: AlertTriggerType;
  changePct: number;
  baselinePrice: number;
  currentPrice: number;
  windowDays: number;
}

/**
 * 価格変動アラートのDiscordメッセージを組み立てる
 */
function buildAlertMessage(payload: DiscordAlertPayload): object {
  const {
    symbol,
    displayName,
    triggerType,
    changePct,
    baselinePrice,
    currentPrice,
    windowDays,
  } = payload;

  const isDrop = triggerType === 'drop_threshold';
  const emoji = isDrop ? '📉' : '📈';
  const directionLabel = isDrop ? '下落' : '上昇';
  const changeLabel = isDrop ? '下落率' : '上昇率';
  const color = isDrop ? 0xff4444 : 0x22c55e; // 赤 / 緑

  const periodLabel = `${Math.max(1, Math.round(windowDays))}日間`;

  return {
    embeds: [
      {
        title: `${emoji} ${displayName} が ${changePct.toFixed(2)}% ${directionLabel}`,
        color,
        fields: [
          { name: '銘柄', value: symbol, inline: true },
          { name: '比較期間', value: periodLabel, inline: true },
          { name: '基準価格', value: baselinePrice.toLocaleString(), inline: true },
          { name: '現在価格', value: currentPrice.toLocaleString(), inline: true },
          { name: changeLabel, value: `${changePct.toFixed(2)}%`, inline: true },
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
