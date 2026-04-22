import { Hono } from 'hono';
import type { Env, ApiResponse } from '../types';
import type { User, Watchlist, WatchlistInput, WatchlistResponse } from '../types/alert';
import { authMiddleware } from '../middleware/auth';

const watchlists = new Hono<{
  Bindings: Env;
  Variables: { user: User };
}>();

watchlists.use('*', authMiddleware);

/** DB行 → APIレスポンス変換 */
function toResponse(row: Watchlist): WatchlistResponse {
  return {
    id: row.id,
    symbol: row.symbol,
    displayName: row.display_name,
    fundId: row.fund_id,
    enabled: row.enabled === 1,
    dropThresholdPct: row.drop_threshold_pct,
    windowHours: row.window_hours,
    cooldownMinutes: row.cooldown_minutes,
    lastNotifiedAt: row.last_notified_at,
  };
}

/**
 * GET /api/settings/watchlists
 */
watchlists.get('/', async (c) => {
  try {
    const user = c.get('user');
    const rows = await c.env.DB.prepare(
      'SELECT * FROM watchlists WHERE user_id = ? ORDER BY created_at ASC'
    ).bind(user.id).all<Watchlist>();

    return c.json<ApiResponse<WatchlistResponse[]>>({
      success: true,
      data: (rows.results || []).map(toResponse),
    });
  } catch (error) {
    console.error('[watchlists/list] Error:', error);
    return c.json<ApiResponse<null>>({ success: false, error: 'Internal server error' }, 500);
  }
});

/**
 * POST /api/settings/watchlists
 */
watchlists.post('/', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<WatchlistInput>();

    if (!body.symbol || !body.display_name) {
      return c.json<ApiResponse<null>>({ success: false, error: 'symbol and display_name are required' }, 400);
    }

    const fundId = body.fund_id ?? c.env.DEFAULT_FUND_ID;
    // fund_id の存在チェック（未登録の銘柄は弾く）
    const fundRow = await c.env.DB.prepare('SELECT id FROM funds WHERE id = ?').bind(fundId).first();
    if (!fundRow) {
      return c.json<ApiResponse<null>>({ success: false, error: `Unknown fundId: ${fundId}` }, 400);
    }

    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO watchlists (id, user_id, symbol, display_name, fund_id, enabled, drop_threshold_pct, window_hours, cooldown_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      user.id,
      body.symbol,
      body.display_name,
      fundId,
      body.enabled !== false ? 1 : 0,
      body.drop_threshold_pct ?? 5.0,
      body.window_hours ?? 24,
      body.cooldown_minutes ?? 180
    ).run();

    const created = await c.env.DB.prepare(
      'SELECT * FROM watchlists WHERE id = ?'
    ).bind(id).first<Watchlist>();

    return c.json<ApiResponse<WatchlistResponse>>({
      success: true,
      data: toResponse(created!),
    }, 201);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      return c.json<ApiResponse<null>>({ success: false, error: 'This symbol is already in your watchlist' }, 409);
    }
    console.error('[watchlists/create] Error:', error);
    return c.json<ApiResponse<null>>({ success: false, error: 'Internal server error' }, 500);
  }
});

/**
 * PATCH /api/settings/watchlists/:id
 */
watchlists.patch('/:id', async (c) => {
  try {
    const user = c.get('user');
    const watchlistId = c.req.param('id');
    const body = await c.req.json<Partial<WatchlistInput>>();

    // 所有権チェック
    const existing = await c.env.DB.prepare(
      'SELECT * FROM watchlists WHERE id = ? AND user_id = ?'
    ).bind(watchlistId, user.id).first<Watchlist>();

    if (!existing) {
      return c.json<ApiResponse<null>>({ success: false, error: 'Watchlist not found' }, 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.display_name !== undefined) {
      updates.push('display_name = ?');
      values.push(body.display_name);
    }
    if (body.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(body.enabled ? 1 : 0);
    }
    if (body.drop_threshold_pct !== undefined) {
      updates.push('drop_threshold_pct = ?');
      values.push(body.drop_threshold_pct);
    }
    if (body.window_hours !== undefined) {
      updates.push('window_hours = ?');
      values.push(body.window_hours);
    }
    if (body.cooldown_minutes !== undefined) {
      updates.push('cooldown_minutes = ?');
      values.push(body.cooldown_minutes);
    }

    if (updates.length === 0) {
      return c.json<ApiResponse<null>>({ success: false, error: 'No fields to update' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    values.push(watchlistId, user.id);

    await c.env.DB.prepare(
      `UPDATE watchlists SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
    ).bind(...values).run();

    const updated = await c.env.DB.prepare(
      'SELECT * FROM watchlists WHERE id = ?'
    ).bind(watchlistId).first<Watchlist>();

    return c.json<ApiResponse<WatchlistResponse>>({
      success: true,
      data: toResponse(updated!),
    });
  } catch (error) {
    console.error('[watchlists/update] Error:', error);
    return c.json<ApiResponse<null>>({ success: false, error: 'Internal server error' }, 500);
  }
});

/**
 * DELETE /api/settings/watchlists/:id
 */
watchlists.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    const watchlistId = c.req.param('id');

    const result = await c.env.DB.prepare(
      'DELETE FROM watchlists WHERE id = ? AND user_id = ?'
    ).bind(watchlistId, user.id).run();

    if (result.meta.changes === 0) {
      return c.json<ApiResponse<null>>({ success: false, error: 'Watchlist not found' }, 404);
    }

    return c.json<ApiResponse<null>>({ success: true }, 200);
  } catch (error) {
    console.error('[watchlists/delete] Error:', error);
    return c.json<ApiResponse<null>>({ success: false, error: 'Internal server error' }, 500);
  }
});

export default watchlists;
