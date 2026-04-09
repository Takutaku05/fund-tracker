import { Hono } from 'hono';
import type { Env, ApiResponse, NavRecord, HistoryQuery } from '../types';

const history = new Hono<{ Bindings: Env }>();

/**
 * 期間文字列から日付を計算する
 */
function getDateFromPeriod(period: string): string {
  const now = new Date();
  switch (period) {
    case 'week':
      now.setDate(now.getDate() - 7);
      break;
    case 'month':
      now.setMonth(now.getMonth() - 1);
      break;
    case '3month':
      now.setMonth(now.getMonth() - 3);
      break;
    case '6month':
      now.setMonth(now.getMonth() - 6);
      break;
    case 'year':
      now.setFullYear(now.getFullYear() - 1);
      break;
    case 'all':
    default:
      return '2000-01-01'; // 十分古い日付
  }

  return now.toISOString().split('T')[0];
}

/**
 * GET /api/history
 * 基準価額の履歴データを返す
 *
 * Query params:
 *   period: week | month | 3month | 6month | year | all
 *   from: YYYY-MM-DD (custom range)
 *   to: YYYY-MM-DD (custom range)
 */
history.get('/', async (c) => {
  try {
    const period = c.req.query('period') || 'month';
    const fromDate = c.req.query('from') || getDateFromPeriod(period);
    const toDate = c.req.query('to') || new Date().toISOString().split('T')[0];

    const rows = await c.env.DB.prepare(
      `SELECT date, nav, net_asset
       FROM nav_history
       WHERE date >= ? AND date <= ?
       ORDER BY date ASC`
    )
      .bind(fromDate, toDate)
      .all();

    const data = (rows.results || []) as unknown as NavRecord[];

    return c.json<ApiResponse<NavRecord[]>>({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[history] Error:', error);
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error',
    }, 500);
  }
});

export default history;
