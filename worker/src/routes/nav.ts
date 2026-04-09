import { Hono } from 'hono';
import type { Env, ApiResponse, LatestNavResponse } from '../types';
import { calculateChange, calculateValuation } from '../lib/calc';

const nav = new Hono<{ Bindings: Env }>();

/**
 * GET /api/nav/latest
 * 最新の基準価額と前日比を返す
 */
nav.get('/latest', async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      'SELECT * FROM nav_history ORDER BY date DESC LIMIT 2'
    ).all();

    if (!rows.results || rows.results.length === 0) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: 'No NAV data available',
      }, 404);
    }

    const current = rows.results[0] as unknown as { date: string; nav: number; net_asset: number | null };
    const previous = rows.results.length > 1
      ? rows.results[1] as unknown as { date: string; nav: number; net_asset: number | null }
      : null;

    const { change, changePercent } = calculateChange(
      { date: current.date, nav: current.nav, net_asset: current.net_asset, created_at: '' },
      previous ? { date: previous.date, nav: previous.nav, net_asset: previous.net_asset, created_at: '' } : null
    );

    const response: LatestNavResponse = {
      date: current.date,
      nav: current.nav,
      netAsset: current.net_asset,
      previousNav: previous?.nav ?? null,
      change,
      changePercent,
    };

    return c.json<ApiResponse<LatestNavResponse>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('[nav/latest] Error:', error);
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error',
    }, 500);
  }
});

/**
 * GET /api/nav/valuation
 * 保有口数と投資総額に基づく評価額を返す
 */
nav.get('/valuation', async (c) => {
  try {
    const row = await c.env.DB.prepare(
      'SELECT * FROM nav_history ORDER BY date DESC LIMIT 1'
    ).first();

    if (!row) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: 'No NAV data available',
      }, 404);
    }

    const current = row as unknown as { date: string; nav: number };
    const totalUnits = parseInt(c.env.TOTAL_UNITS || '0', 10);
    const totalInvested = parseInt(c.env.TOTAL_INVESTED || '0', 10);

    const valuation = calculateValuation(
      current.nav,
      totalUnits,
      totalInvested,
      current.date
    );

    return c.json<ApiResponse<typeof valuation>>({
      success: true,
      data: valuation,
    });
  } catch (error) {
    console.error('[nav/valuation] Error:', error);
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error',
    }, 500);
  }
});

export default nav;
