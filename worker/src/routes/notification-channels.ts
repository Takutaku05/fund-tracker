import { Hono } from 'hono';
import type { Env, ApiResponse } from '../types';
import type {
  User,
  NotificationChannel,
  NotificationChannelInput,
  NotificationChannelResponse,
} from '../types/alert';
import { authMiddleware } from '../middleware/auth';
import { encrypt, decrypt } from '../lib/crypto';

const channels = new Hono<{
  Bindings: Env;
  Variables: { user: User };
}>();

channels.use('*', authMiddleware);

/** DB行 → APIレスポンス変換（webhook URLは返さない） */
function toResponse(row: NotificationChannel): NotificationChannelResponse {
  return {
    id: row.id,
    type: row.type,
    enabled: row.enabled === 1,
    lastTestedAt: row.last_tested_at,
  };
}

/**
 * GET /api/settings/notification-channels
 */
channels.get('/', async (c) => {
  try {
    const user = c.get('user');
    const rows = await c.env.DB.prepare(
      'SELECT * FROM notification_channels WHERE user_id = ? ORDER BY created_at ASC'
    ).bind(user.id).all<NotificationChannel>();

    return c.json<ApiResponse<NotificationChannelResponse[]>>({
      success: true,
      data: (rows.results || []).map(toResponse),
    });
  } catch (error) {
    console.error('[channels/list] Error:', error);
    return c.json<ApiResponse<null>>({ success: false, error: 'Internal server error' }, 500);
  }
});

/**
 * POST /api/settings/notification-channels
 */
channels.post('/', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<NotificationChannelInput>();

    if (!body.webhook_url) {
      return c.json<ApiResponse<null>>({ success: false, error: 'webhook_url is required' }, 400);
    }

    // Discord webhook URL形式の簡易バリデーション
    if (!body.webhook_url.startsWith('https://discord.com/api/webhooks/') &&
        !body.webhook_url.startsWith('https://discordapp.com/api/webhooks/')) {
      return c.json<ApiResponse<null>>({ success: false, error: 'Invalid Discord webhook URL' }, 400);
    }

    const id = crypto.randomUUID();
    const webhookEncrypted = await encrypt(body.webhook_url, c.env.ENCRYPTION_KEY);

    await c.env.DB.prepare(
      `INSERT INTO notification_channels (id, user_id, type, webhook_encrypted, enabled)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      id,
      user.id,
      body.type ?? 'discord_webhook',
      webhookEncrypted,
      body.enabled !== false ? 1 : 0
    ).run();

    const created = await c.env.DB.prepare(
      'SELECT * FROM notification_channels WHERE id = ?'
    ).bind(id).first<NotificationChannel>();

    return c.json<ApiResponse<NotificationChannelResponse>>({
      success: true,
      data: toResponse(created!),
    }, 201);
  } catch (error) {
    console.error('[channels/create] Error:', error);
    return c.json<ApiResponse<null>>({ success: false, error: 'Internal server error' }, 500);
  }
});

/**
 * PATCH /api/settings/notification-channels/:id
 */
channels.patch('/:id', async (c) => {
  try {
    const user = c.get('user');
    const channelId = c.req.param('id');
    const body = await c.req.json<Partial<NotificationChannelInput>>();

    const existing = await c.env.DB.prepare(
      'SELECT * FROM notification_channels WHERE id = ? AND user_id = ?'
    ).bind(channelId, user.id).first<NotificationChannel>();

    if (!existing) {
      return c.json<ApiResponse<null>>({ success: false, error: 'Channel not found' }, 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.webhook_url !== undefined) {
      if (!body.webhook_url.startsWith('https://discord.com/api/webhooks/') &&
          !body.webhook_url.startsWith('https://discordapp.com/api/webhooks/')) {
        return c.json<ApiResponse<null>>({ success: false, error: 'Invalid Discord webhook URL' }, 400);
      }
      updates.push('webhook_encrypted = ?');
      values.push(await encrypt(body.webhook_url, c.env.ENCRYPTION_KEY));
    }
    if (body.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(body.enabled ? 1 : 0);
    }

    if (updates.length === 0) {
      return c.json<ApiResponse<null>>({ success: false, error: 'No fields to update' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    values.push(channelId, user.id);

    await c.env.DB.prepare(
      `UPDATE notification_channels SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
    ).bind(...values).run();

    const updated = await c.env.DB.prepare(
      'SELECT * FROM notification_channels WHERE id = ?'
    ).bind(channelId).first<NotificationChannel>();

    return c.json<ApiResponse<NotificationChannelResponse>>({
      success: true,
      data: toResponse(updated!),
    });
  } catch (error) {
    console.error('[channels/update] Error:', error);
    return c.json<ApiResponse<null>>({ success: false, error: 'Internal server error' }, 500);
  }
});

/**
 * POST /api/settings/notification-channels/:id/test
 * テスト通知を送信する
 */
channels.post('/:id/test', async (c) => {
  try {
    const user = c.get('user');
    const channelId = c.req.param('id');

    const channel = await c.env.DB.prepare(
      'SELECT * FROM notification_channels WHERE id = ? AND user_id = ?'
    ).bind(channelId, user.id).first<NotificationChannel>();

    if (!channel) {
      return c.json<ApiResponse<null>>({ success: false, error: 'Channel not found' }, 404);
    }

    const webhookUrl = await decrypt(channel.webhook_encrypted, c.env.ENCRYPTION_KEY);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '🔔 **Fund Tracker** テスト通知です。この通知が届いていれば設定は正常です。',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[channels/test] Discord API error:', errorText);
      return c.json<ApiResponse<null>>({
        success: false,
        error: `Discord API returned ${response.status}`,
      }, 502);
    }

    // last_tested_at を更新
    await c.env.DB.prepare(
      "UPDATE notification_channels SET last_tested_at = datetime('now') WHERE id = ?"
    ).bind(channelId).run();

    return c.json<ApiResponse<{ sent: boolean }>>({
      success: true,
      data: { sent: true },
    });
  } catch (error) {
    console.error('[channels/test] Error:', error);
    return c.json<ApiResponse<null>>({ success: false, error: 'Internal server error' }, 500);
  }
});

export default channels;
