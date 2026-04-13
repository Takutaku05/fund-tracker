import { Hono } from 'hono';
import type { Env } from '../types';
import {
  createSession,
  deleteSession,
  getSessionIdFromCookie,
  getUserFromSession,
  makeSessionCookie,
  makeClearSessionCookie,
} from '../lib/session';

const auth = new Hono<{ Bindings: Env }>();

/**
 * GET /api/auth/login
 * Google OAuth 認可ページにリダイレクト
 */
auth.get('/login', (c) => {
  const state = crypto.randomUUID();
  const redirectUri = `${c.env.APP_BASE_URL}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  // CSRF 対策: state を Cookie に保存しつつ認可ページへリダイレクト
  const stateCookie = `ft_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;

  return new Response(null, {
    status: 302,
    headers: {
      'Location': `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'Set-Cookie': stateCookie,
    },
  });
});

/**
 * GET /api/auth/callback
 * Google OAuth コールバック
 */
auth.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code || !state) {
    return c.json({ success: false, error: 'Missing code or state' }, 400);
  }

  // CSRF チェック
  const cookieHeader = c.req.header('Cookie') || '';
  const stateMatch = cookieHeader.match(/ft_oauth_state=([^;]+)/);
  if (!stateMatch || stateMatch[1] !== state) {
    return c.json({ success: false, error: 'Invalid OAuth state' }, 403);
  }

  // アクセストークン取得
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${c.env.APP_BASE_URL}/api/auth/callback`,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json() as { access_token?: string; id_token?: string; error?: string };

  if (!tokenData.access_token) {
    console.error('[auth/callback] Token error:', tokenData);
    return c.json({ success: false, error: 'Failed to get access token' }, 502);
  }

  // Google ユーザー情報取得
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
  });

  const gUser = await userRes.json() as {
    id: string;
    email?: string;
    verified_email?: boolean;
    name?: string;
    picture?: string;
  };

  if (!gUser.id) {
    return c.json({ success: false, error: 'Failed to get user info' }, 502);
  }

  const email = gUser.verified_email ? (gUser.email || null) : null;

  // ユーザーを upsert
  const userId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO users (id, auth_provider, auth_subject, email)
     VALUES (?, 'google', ?, ?)
     ON CONFLICT(auth_provider, auth_subject) DO UPDATE SET
       email = excluded.email,
       updated_at = datetime('now')`
  ).bind(userId, gUser.id, email).run();

  // upsert 後の実際のユーザーID取得
  const dbUser = await c.env.DB.prepare(
    "SELECT id FROM users WHERE auth_provider = 'google' AND auth_subject = ?"
  ).bind(gUser.id).first<{ id: string }>();

  if (!dbUser) {
    return c.json({ success: false, error: 'Failed to create user' }, 500);
  }

  // セッション作成
  const sessionId = await createSession(c.env.DB, dbUser.id);

  // state Cookie を削除し、session Cookie をセット
  const resHeaders = new Headers();
  resHeaders.append('Set-Cookie', makeSessionCookie(sessionId));
  resHeaders.append('Set-Cookie', 'ft_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  resHeaders.set('Location', c.env.FRONTEND_URL || c.env.APP_BASE_URL || '/');

  return new Response(null, { status: 302, headers: resHeaders });
});

/**
 * GET /api/auth/me
 * 現在のログインユーザー情報を返す
 */
auth.get('/me', async (c) => {
  const sessionId = getSessionIdFromCookie(c.req.header('Cookie'));

  if (!sessionId) {
    return c.json({ success: true, data: null });
  }

  const user = await getUserFromSession(c.env.DB, sessionId);

  if (!user) {
    return c.json({ success: true, data: null }, 200, {
      'Set-Cookie': makeClearSessionCookie(),
    } as Record<string, string>);
  }

  return c.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      authProvider: user.auth_provider,
    },
  });
});

/**
 * POST /api/auth/logout
 * セッションを破棄してログアウト
 */
auth.post('/logout', async (c) => {
  const sessionId = getSessionIdFromCookie(c.req.header('Cookie'));

  if (sessionId) {
    await deleteSession(c.env.DB, sessionId);
  }

  return c.json({ success: true }, 200, {
    'Set-Cookie': makeClearSessionCookie(),
  } as Record<string, string>);
});

export default auth;
