import { Hono } from 'hono';
import type { Env, ApiResponse, LatestNavResponse, AlltimePeakResponse } from '../types';
import { calculateChange } from '../lib/calc';
import { loadFund, toFundMeta } from '../lib/funds';

const nav = new Hono<{ Bindings: Env }>();

function resolveFundId(c: { req: { query: (k: string) => string | undefined }, env: Env }): string {
  return c.req.query('fundId') || c.env.DEFAULT_FUND_ID;
}

/**
 * GET /api/nav/latest?fundId=emaxis-ac
 * 指定銘柄の最新基準価額と前日比を返す
 */
nav.get('/latest', async (c) => {
  try {
    const fundId = resolveFundId(c);
    const fund = await loadFund(c.env.DB, fundId);
    if (!fund) {
      return c.json<ApiResponse<null>>({ success: false, error: `Unknown fundId: ${fundId}` }, 404);
    }

    const rows = await c.env.DB.prepare(
      'SELECT date, nav, net_asset FROM nav_history WHERE fund_id = ? ORDER BY date DESC LIMIT 2'
    ).bind(fundId).all();

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
      fund: toFundMeta(fund),
      date: current.date,
      nav: current.nav,
      netAsset: current.net_asset,
      previousNav: previous?.nav ?? null,
      change,
      changePercent,
    };

    return c.json<ApiResponse<LatestNavResponse>>({ success: true, data: response });
  } catch (error) {
    console.error('[nav/latest] Error:', error);
    return c.json<ApiResponse<null>>({ success: false, error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/nav/alltime-peak?fundId=emaxis-ac
 * 指定銘柄の全期間最高値と現在値からの下落率を返す
 */
nav.get('/alltime-peak', async (c) => {
  try {
    const fundId = resolveFundId(c);
    const fund = await loadFund(c.env.DB, fundId);
    if (!fund) {
      return c.json<ApiResponse<null>>({ success: false, error: `Unknown fundId: ${fundId}` }, 404);
    }

    const peakRow = await c.env.DB.prepare(
      'SELECT date, nav FROM nav_history WHERE fund_id = ? ORDER BY nav DESC LIMIT 1'
    ).bind(fundId).first();

    const latestRow = await c.env.DB.prepare(
      'SELECT nav FROM nav_history WHERE fund_id = ? ORDER BY date DESC LIMIT 1'
    ).bind(fundId).first();

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
        fund: toFundMeta(fund),
        peak: peak.nav,
        peakDate: peak.date,
        drawdown,
        drawdownPercent,
      },
    });
  } catch (error) {
    console.error('[nav/alltime-peak] Error:', error);
    return c.json<ApiResponse<null>>({ success: false, error: 'Internal server error' }, 500);
  }
});

export default nav;
