/**
 * セッション管理ユーティリティ
 * D1 + Cookie ベースのセッション管理
 */

import type { User } from '../types/alert';

const SESSION_COOKIE = 'ft_session';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30日（秒）

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

/**
 * 新規セッションを作成して D1 に保存する
 */
export async function createSession(db: D1Database, userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();

  await db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(sessionId, userId, expiresAt).run();

  return sessionId;
}

/**
 * セッションIDからユーザーを取得する
 * 期限切れセッションは削除して null を返す
 */
export async function getUserFromSession(db: D1Database, sessionId: string): Promise<User | null> {
  const session = await db.prepare(
    'SELECT * FROM sessions WHERE id = ?'
  ).bind(sessionId).first<Session>();

  if (!session) return null;

  // 期限切れチェック
  if (new Date(session.expires_at) < new Date()) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
    return null;
  }

  const user = await db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(session.user_id).first<User>();

  return user ?? null;
}

/**
 * セッションを削除する（ログアウト）
 */
export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}

/**
 * リクエストからセッションID（Cookie）を取得する
 */
export function getSessionIdFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;

  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * セッション Cookie の Set-Cookie ヘッダー値を生成する
 */
export function makeSessionCookie(sessionId: string): string {
  const parts = [
    `${SESSION_COOKIE}=${sessionId}`,
    `Path=/`,
    `HttpOnly`,
    `Secure`,
    `SameSite=None`,
    `Max-Age=${SESSION_MAX_AGE}`,
  ];
  return parts.join('; ');
}

/**
 * セッション Cookie を削除する Set-Cookie ヘッダー値
 */
export function makeClearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`;
}
