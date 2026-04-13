import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import navRoutes from './routes/nav';
import historyRoutes from './routes/history';
import healthRoutes from './routes/health';
import watchlistRoutes from './routes/watchlists';
import channelRoutes from './routes/notification-channels';
import authRoutes from './routes/auth';
import { handleCronFetchNav } from './cron/fetch-nav';
import { handleCronCheckAlerts } from './cron/check-alerts';

const app = new Hono<{ Bindings: Env }>();

// CORS 設定（Pages からのリクエストを許可）
app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      const frontend = c.env.FRONTEND_URL;
      // 開発時は localhost を許可、本番は FRONTEND_URL のみ
      const allowed = [frontend, 'http://localhost:5173'].filter(Boolean);
      return allowed.includes(origin) ? origin : frontend;
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    credentials: true,
  })
);

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/nav', navRoutes);
app.route('/api/history', historyRoutes);
app.route('/api/health', healthRoutes);
app.route('/api/settings/watchlists', watchlistRoutes);
app.route('/api/settings/notification-channels', channelRoutes);

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
      'GET /api/auth/login',
      'GET /api/auth/callback',
      'GET /api/auth/me',
      'POST /api/auth/logout',
      'GET /api/nav/latest',
      'GET /api/nav/alltime-peak',
      'GET /api/history?period=month',
      'GET /api/health',
      'GET|POST /api/settings/watchlists',
      'PATCH|DELETE /api/settings/watchlists/:id',
      'GET|POST /api/settings/notification-channels',
      'PATCH /api/settings/notification-channels/:id',
      'POST /api/settings/notification-channels/:id/test',
    ],
  });
});

// Export for Cloudflare Workers
export default {
  fetch: app.fetch,

  // Cron Trigger handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      handleCronFetchNav(env).then(() => handleCronCheckAlerts(env))
    );
  },
};
