/**
 * アラートチェック Cron ハンドラ
 * 全ユーザーの有効な watchlist を走査し、条件を満たす場合に Discord 通知を送信する
 */

import type { Env } from '../types';
import type { Watchlist, NotificationChannel, AlertTriggerType } from '../types/alert';
import { checkWatchlistAlert } from '../lib/alert-checker';
import { sendDiscordAlert } from '../lib/discord';
import { decrypt } from '../lib/crypto';

export async function handleCronCheckAlerts(env: Env): Promise<void> {
  console.log('[alert-cron] Starting alert check...');

  // 1. 有効な watchlist を全件取得
  const watchlists = await env.DB.prepare(
    'SELECT * FROM watchlists WHERE enabled = 1'
  ).all<Watchlist>();

  if (!watchlists.results || watchlists.results.length === 0) {
    console.log('[alert-cron] No enabled watchlists found');
    return;
  }

  console.log(`[alert-cron] Checking ${watchlists.results.length} watchlists`);

  let notifiedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const watchlist of watchlists.results) {
    try {
      // 2. 下落率を判定
      const result = await checkWatchlistAlert(env.DB, watchlist);

      if (!result.notified) {
        skippedCount++;
        console.log(
          `[alert-cron] Skip ${watchlist.symbol} (user=${watchlist.user_id}): ${result.reason}, change=${result.changePct.toFixed(2)}%`
        );
        continue;
      }

      // notified === true なら必ず triggerType が設定される
      const triggerType = result.triggerType!;

      // 3. ユーザーの有効な通知チャンネルを取得
      const channels = await env.DB.prepare(
        "SELECT * FROM notification_channels WHERE user_id = ? AND enabled = 1 AND type = 'discord_webhook'"
      ).bind(watchlist.user_id).all<NotificationChannel>();

      if (!channels.results || channels.results.length === 0) {
        skippedCount++;
        console.log(
          `[alert-cron] Skip ${watchlist.symbol} (user=${watchlist.user_id}): no_channel`
        );

        // alert_events に記録（チャンネルなし）
        await saveAlertEvent(env.DB, watchlist, triggerType, result.changePct, result.baselinePrice, result.currentPrice, 'failed', 'No notification channel configured');
        continue;
      }

      // 4. 各チャンネルに通知送信
      for (const channel of channels.results) {
        let deliveryStatus: 'sent' | 'failed' = 'sent';
        let deliveryError: string | null = null;

        try {
          const webhookUrl = await decrypt(channel.webhook_encrypted, env.ENCRYPTION_KEY);

          const error = await sendDiscordAlert(webhookUrl, {
            symbol: watchlist.symbol,
            displayName: watchlist.display_name,
            triggerType,
            changePct: result.changePct,
            baselinePrice: result.baselinePrice,
            currentPrice: result.currentPrice,
            windowDays: watchlist.window_days,
          });

          if (error) {
            deliveryStatus = 'failed';
            deliveryError = error;
            errorCount++;
            console.error(`[alert-cron] Discord send failed for ${watchlist.symbol}:`, error);
          } else {
            notifiedCount++;
            console.log(
              `[alert-cron] Notified ${watchlist.symbol} (user=${watchlist.user_id}): ${triggerType}=${result.changePct.toFixed(2)}%`
            );
          }
        } catch (err) {
          deliveryStatus = 'failed';
          deliveryError = String(err);
          errorCount++;
          console.error(`[alert-cron] Error sending to channel ${channel.id}:`, err);
        }

        // 5. alert_events に保存
        await saveAlertEvent(
          env.DB, watchlist, triggerType, result.changePct,
          result.baselinePrice, result.currentPrice,
          deliveryStatus, deliveryError
        );
      }

      // 6. last_notified_at を更新
      await env.DB.prepare(
        "UPDATE watchlists SET last_notified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
      ).bind(watchlist.id).run();
    } catch (err) {
      errorCount++;
      console.error(`[alert-cron] Error processing watchlist ${watchlist.id}:`, err);
    }
  }

  console.log(
    `[alert-cron] Done. notified=${notifiedCount}, skipped=${skippedCount}, errors=${errorCount}`
  );
}

async function saveAlertEvent(
  db: D1Database,
  watchlist: Watchlist,
  triggerType: AlertTriggerType,
  changePct: number,
  baselinePrice: number,
  currentPrice: number,
  deliveryStatus: 'sent' | 'failed',
  deliveryError: string | null
): Promise<void> {
  const id = crypto.randomUUID();

  await db.prepare(
    `INSERT INTO alert_events (id, user_id, watchlist_id, symbol, trigger_type, drop_pct, baseline_price, current_price, delivery_status, delivery_error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    watchlist.user_id,
    watchlist.id,
    watchlist.symbol,
    triggerType,
    changePct,
    baselinePrice,
    currentPrice,
    deliveryStatus,
    deliveryError
  ).run();
}
