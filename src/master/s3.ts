import { createHash, createHmac } from 'node:crypto';
import type { MasterContext } from './db';
import { getMasterSetting } from './db';

export type S3Config = {
  endpoint: string; // e.g. https://<account_id>.r2.cloudflarestorage.com or https://s3.us-east-1.amazonaws.com
  region: string;   // e.g. auto or us-east-1
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix: string;
};

export function readS3Config(ctx: MasterContext): S3Config {
  return {
    endpoint: getMasterSetting(ctx, 'backup_s3_endpoint').replace(/\/+$/, ''),
    region: getMasterSetting(ctx, 'backup_s3_region') || 'auto',
    bucket: getMasterSetting(ctx, 'backup_s3_bucket'),
    accessKeyId: getMasterSetting(ctx, 'backup_s3_access_key'),
    secretAccessKey: getMasterSetting(ctx, 'backup_s3_secret_key'),
    prefix: getMasterSetting(ctx, 'backup_s3_prefix').replace(/^\/+|\/+$/g, ''),
  };
}

export function isS3Configured(cfg: S3Config): boolean {
  return Boolean(cfg.endpoint && cfg.bucket && cfg.accessKeyId && cfg.secretAccessKey);
}

function sha256Hex(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function signedRequest(
  cfg: S3Config,
  method: 'PUT' | 'GET' | 'HEAD' | 'DELETE',
  objectKey: string,
  body: Buffer = Buffer.alloc(0),
  contentType = 'application/octet-stream',
): { url: string; headers: Record<string, string> } {
  const cleanKey = objectKey.replace(/^\/+/, '');
  const fullKey = cfg.prefix ? `${cfg.prefix}/${cleanKey}` : cleanKey;
  const endpointUrl = new URL(cfg.endpoint);
  const path = `${endpointUrl.pathname.replace(/\/+$/, '')}/${encodeURIComponent(cfg.bucket)}/${fullKey.split('/').map(encodeURIComponent).join('/')}`;
  const url = `${endpointUrl.origin}${path}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const host = endpointUrl.host;

  const headersToSign: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (method === 'PUT') headersToSign['content-type'] = contentType;

  const sortedKeys = Object.keys(headersToSign).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${headersToSign[k]}\n`).join('');
  const signedHeaders = sortedKeys.join(';');
  const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');

  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');

  const kDate = hmac('AWS4' + cfg.secretAccessKey, dateStamp);
  const kRegion = hmac(kDate, cfg.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return {
    url,
    headers: {
      ...headersToSign,
      Authorization: authorization,
    },
  };
}

export async function s3PutObject(cfg: S3Config, key: string, data: Buffer): Promise<string> {
  const { url, headers } = signedRequest(cfg, 'PUT', key, data);
  const res = await fetch(url, { method: 'PUT', headers, body: new Uint8Array(data) });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`S3 PUT failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  return cfg.prefix ? `${cfg.prefix}/${key}` : key;
}

export async function s3GetObject(cfg: S3Config, key: string): Promise<Buffer> {
  const { url, headers } = signedRequest(cfg, 'GET', key);
  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) {
    throw new Error(`S3 GET failed (${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}
