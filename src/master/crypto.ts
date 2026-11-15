import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto';
import { hashPassword, verifyPassword } from '../lib/auth';

const b64url = (buf: Buffer | Uint8Array): string =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromB64url = (str: string): Buffer => {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  return Buffer.from(padded, 'base64');
};

export function randomId(prefix = '', bytes = 8): string {
  const hex = randomBytes(bytes).toString('hex');
  return prefix ? `${prefix}_${hex}` : hex;
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return nodeTimingSafeEqual(ba, bb);
}

function aesKey(masterKey: string): Buffer {
  return createHash('sha256').update('master-aes-v1:' + masterKey).digest();
}

export function encryptSecret(plaintext: string, masterKey: string): string {
  if (!plaintext) return '';
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', aesKey(masterKey), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${b64url(iv)}.${b64url(tag)}.${b64url(enc)}`;
}

export function decryptSecret(stored: string, masterKey: string): string {
  if (!stored) return '';
  if (!stored.startsWith('v1.')) return stored;
  const parts = stored.split('.');
  if (parts.length !== 4) throw new Error('Malformed encrypted secret');
  const [, ivStr, tagStr, encStr] = parts;
  const decipher = createDecipheriv('aes-256-gcm', aesKey(masterKey), fromB64url(ivStr));
  decipher.setAuthTag(fromB64url(tagStr));
  const dec = Buffer.concat([decipher.update(fromB64url(encStr)), decipher.final()]);
  return dec.toString('utf8');
}

export function encryptBuffer(plain: Buffer, keyMaterial: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', aesKey(keyMaterial), iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: "AHM1" (4) + iv (12) + tag (16) + ciphertext
  return Buffer.concat([Buffer.from('AHM1'), iv, tag, enc]);
}

export function decryptBuffer(blob: Buffer, keyMaterial: string): Buffer {
  if (blob.length < 32 || blob.subarray(0, 4).toString('ascii') !== 'AHM1') {
    throw new Error('Invalid encrypted archive header');
  }
  const iv = blob.subarray(4, 16);
  const tag = blob.subarray(16, 32);
  const data = blob.subarray(32);
  const decipher = createDecipheriv('aes-256-gcm', aesKey(keyMaterial), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export const hashMasterPassword = hashPassword;
export const verifyMasterPassword = verifyPassword;

export function hmacSha256(secret: string, data: string): string {
  return b64url(createHmac('sha256', secret).update(data).digest());
}

/** Origin authentication token signed by the Cloudflare Worker Proxy. */
export function signOriginAuth(originSecret: string, hostname: string, nowSec = Math.floor(Date.now() / 1000)): string {
  const host = hostname.trim().toLowerCase();
  const sig = hmacSha256(originSecret, `origin:${nowSec}:${host}`);
  return `${nowSec}.${sig}`;
}

export function verifyOriginAuth(
  originSecret: string,
  headerValue: string | null,
  hostname: string,
  nowSec = Math.floor(Date.now() / 1000),
  maxSkewSec = 60,
): boolean {
  if (!headerValue || !originSecret) return false;
  const [tsRaw, sig] = headerValue.split('.');
  if (!tsRaw || !sig || !/^\d+$/.test(tsRaw)) return false;
  const ts = Number(tsRaw);
  if (Math.abs(nowSec - ts) > maxSkewSec) return false;
  const expected = hmacSha256(originSecret, `origin:${ts}:${hostname.trim().toLowerCase()}`);
  return safeEqual(sig, expected);
}
