import { Hono } from 'hono';
import type { Env, ApiResponse, LatestNavResponse, AlltimePeakResponse } from '../types';
import { calculateChange } from '../lib/calc';

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
 * GET /api/nav/alltime-peak
 * 全期間の最高値と現在値からの下落率を返す
 */
nav.get('/alltime-peak', async (c) => {
  try {
    const peakRow = await c.env.DB.prepare(
      'SELECT date, nav FROM nav_history ORDER BY nav DESC LIMIT 1'
    ).first();

    const latestRow = await c.env.DB.prepare(
      'SELECT nav FROM nav_history ORDER BY date DESC LIMIT 1'
    ).first();

    if (!peakRow || !latestRow) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: 'No NAV data available',
      }, 404);
    }

    const peak = peakRow as unknown as { date: string; nav: number };
    const latest = latestRow as unknown as { nav: number };

    const drawdown = latest.nav - peak.nav;
    const drawdownPercent = Math.round((drawdown / peak.nav) * 10000) / 100;

    return c.json<ApiResponse<AlltimePeakResponse>>({
      success: true,
      data: {
        peak: peak.nav,
        peakDate: peak.date,
        drawdown,
        drawdownPercent,
      },
    });
  } catch (error) {
    console.error('[nav/alltime-peak] Error:', error);
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error',
    }, 500);
  }
});

export default nav;
