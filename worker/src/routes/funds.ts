import { Hono } from 'hono';
import type { Env, ApiResponse, FundMeta } from '../types';
import { loadEnabledFunds, toFundMeta } from '../lib/funds';

const funds = new Hono<{ Bindings: Env }>();

/**
 * GET /api/funds
 * 有効な銘柄の一覧を返す（フロントの切り替え UI 用）
 */
funds.get('/', async (c) => {
  try {
    const rows = await loadEnabledFunds(c.env.DB);
    const metas: FundMeta[] = rows.map(toFundMeta);
    return c.json<ApiResponse<{ funds: FundMeta[] }>>({
      success: true,
      data: { funds: metas },
    });
  } catch (error) {
    console.error('[funds] Error:', error);
    return c.json<ApiResponse<null>>({ success: false, error: 'Internal server error' }, 500);
  }
});

export default funds;
