import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';
import type { User } from '../types/alert';
import { getSessionIdFromCookie, getUserFromSession, makeClearSessionCookie } from '../lib/session';

/**
 * 認証ミドルウェア
 * Cookie ベースのセッション認証でユーザーを特定する
 */
export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: { user: User };
}>(async (c, next) => {
  const sessionId = getSessionIdFromCookie(c.req.header('Cookie'));

  if (!sessionId) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const user = await getUserFromSession(c.env.DB, sessionId);

  if (!user) {
    return c.json({ success: false, error: 'Session expired' }, 401, {
      'Set-Cookie': makeClearSessionCookie(),
    } as Record<string, string>);
  }

  c.set('user', user);
  await next();
});
