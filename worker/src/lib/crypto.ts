/**
 * Webhook URL の暗号化/復号ユーティリティ
 * AES-GCM (256bit) を使用。Workers の Web Crypto API で動作する。
 */

const ALGO = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // AES-GCM recommended

/**
 * ENCRYPTION_KEY 文字列から CryptoKey を導出する
 */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('fund-tracker-webhook-salt'),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 平文を暗号化し、base64 エンコードされた文字列を返す
 * フォーマット: base64(iv + ciphertext)
 */
export async function encrypt(plaintext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    encoder.encode(plaintext)
  );

  // iv + ciphertext を結合
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * base64 エンコードされた暗号文を復号する
 */
export async function decrypt(encoded: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGO, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}
