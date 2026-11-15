import type { MasterContext } from './db';
import { getMasterSetting } from './db';

export type CloudflareConfig = {
  apiToken: string;
  zoneId: string;
  fallbackOrigin: string;
  cnameTarget: string;
};

export type CloudflareHostnameRecord = {
  id: string;
  hostname: string;
  status: string;
  ssl: {
    status: string;
    method?: string;
    type?: string;
    validation_records?: Array<{
      txt_name?: string;
      txt_value?: string;
      http_url?: string;
      http_body?: string;
      cname?: string;
      cname_target?: string;
    }>;
    validation_errors?: Array<{ message: string }>;
  };
  ownership_verification?: {
    type?: string;
    name?: string;
    value?: string;
  };
  ownership_verification_http?: {
    http_url?: string;
    http_body?: string;
  };
  verification_errors?: string[];
};

export function readCloudflareConfig(ctx: MasterContext): CloudflareConfig {
  return {
    apiToken: getMasterSetting(ctx, 'cf_api_token'),
    zoneId: getMasterSetting(ctx, 'cf_zone_id'),
    fallbackOrigin: getMasterSetting(ctx, 'cf_fallback_origin'),
    cnameTarget: getMasterSetting(ctx, 'cf_cname_target'),
  };
}

export function isCloudflareConfigured(cfg: CloudflareConfig): boolean {
  return Boolean(cfg.apiToken && cfg.zoneId);
}

async function cfRequest<T>(cfg: CloudflareConfig, path: string, init: RequestInit = {}): Promise<T> {
  const url = `https://api.cloudflare.com/client/v4${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.apiToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    errors?: Array<{ code?: number; message?: string }>;
    result?: T;
  } | null;

  if (!res.ok || !body?.success || !body.result) {
    const msg = body?.errors?.map((e) => e.message).filter(Boolean).join('; ') || `Cloudflare API HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body.result;
}

export async function findCustomHostname(cfg: CloudflareConfig, hostname: string): Promise<CloudflareHostnameRecord | null> {
  const list = await cfRequest<CloudflareHostnameRecord[]>(
    cfg,
    `/zones/${encodeURIComponent(cfg.zoneId)}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`,
  );
  return list[0] ?? null;
}

export async function createOrGetCustomHostname(cfg: CloudflareConfig, hostname: string): Promise<CloudflareHostnameRecord> {
  const existing = await findCustomHostname(cfg, hostname);
  if (existing) return existing;

  const payload: Record<string, unknown> = {
    hostname,
    ssl: {
      method: 'txt',
      type: 'dv',
      settings: {
        http2: 'on',
        min_tls_version: '1.2',
        tls_1_3: 'on',
      },
    },
  };
  if (cfg.fallbackOrigin) {
    payload.custom_origin_server = cfg.fallbackOrigin;
  }
  return cfRequest<CloudflareHostnameRecord>(cfg, `/zones/${encodeURIComponent(cfg.zoneId)}/custom_hostnames`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCustomHostname(cfg: CloudflareConfig, cfHostnameId: string): Promise<CloudflareHostnameRecord> {
  return cfRequest<CloudflareHostnameRecord>(
    cfg,
    `/zones/${encodeURIComponent(cfg.zoneId)}/custom_hostnames/${encodeURIComponent(cfHostnameId)}`,
  );
}

export async function deleteCustomHostname(cfg: CloudflareConfig, cfHostnameId: string): Promise<void> {
  if (!cfHostnameId) return;
  await cfRequest<unknown>(
    cfg,
    `/zones/${encodeURIComponent(cfg.zoneId)}/custom_hostnames/${encodeURIComponent(cfHostnameId)}`,
    { method: 'DELETE' },
  );
}

export function mapCloudflareStatus(record: CloudflareHostnameRecord): {
  dnsStatus: 'pending' | 'verified' | 'error';
  sslStatus: 'initializing' | 'pending_validation' | 'active' | 'error';
} {
  const dnsStatus =
    record.status === 'active'
      ? 'verified'
      : record.verification_errors?.length
        ? 'error'
        : 'pending';

  const rawSsl = record.ssl?.status || 'initializing';
  const sslStatus =
    rawSsl === 'active'
      ? 'active'
      : rawSsl === 'pending_validation' || rawSsl === 'pending_issuance' || rawSsl === 'pending_deployment'
        ? 'pending_validation'
        : record.ssl?.validation_errors?.length
          ? 'error'
          : 'initializing';

  return { dnsStatus, sslStatus };
}
