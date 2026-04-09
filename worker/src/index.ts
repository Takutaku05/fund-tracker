import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import navRoutes from './routes/nav';
import historyRoutes from './routes/history';
import healthRoutes from './routes/health';
import { handleCronFetchNav } from './cron/fetch-nav';

const app = new Hono<{ Bindings: Env }>();

// CORS 設定（Pages からのリクエストを許可）
app.use(
  '/api/*',
  cors({
    origin: '*', // デプロイ後は Pages の URL に制限可能
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })
);

// Routes
app.route('/api/nav', navRoutes);
app.route('/api/history', historyRoutes);
app.route('/api/health', healthRoutes);

// Dev only - seed database trigger
app.get('/api/dev/seed', async (c) => {
  try {
    await handleCronFetchNav(c.env);
    return c.json({ success: true, message: 'Database seeded' });
  } catch (error) {
    return c.json({ success: false, message: 'Seed failed', error: String(error) }, 500);
  }
});

// Root
app.get('/', (c) => {
  return c.json({
    name: 'fund-tracker-worker',
    version: '1.0.0',
    endpoints: [
      'GET /api/nav/latest',
      'GET /api/nav/valuation',
      'GET /api/history?period=month',
      'GET /api/health',
    ],
  });
});

// Export for Cloudflare Workers
export default {
  fetch: app.fetch,

  // Cron Trigger handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleCronFetchNav(env));
  },
};
