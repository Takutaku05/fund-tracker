import { Hono } from 'hono';
import type { Env, ApiResponse } from '../types';

const health = new Hono<{ Bindings: Env }>();

/**
 * GET /api/health
 * ヘルスチェックエンドポイント
 */
health.get('/', async (c) => {
  try {
    // D1 接続確認
    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM nav_history'
    ).first();

    const count = (result as unknown as { count: number })?.count ?? 0;

    return c.json<ApiResponse<{ status: string; records: number; timestamp: string }>>({
      success: true,
      data: {
        status: 'ok',
        records: count,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return c.json<ApiResponse<{ status: string }>>({
      success: false,
      data: { status: 'error' },
      error: 'Database connection failed',
    }, 500);
  }
});

export default health;
