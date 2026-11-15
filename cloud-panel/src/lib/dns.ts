/**
 * Live DNS lookups through Google's public DNS-over-HTTPS endpoint — the same
 * service the Termux panel uses. No API key and no rate limit problems at panel
 * scale.
 */

export type DnsAnswer = { name: string; type: number; TTL: number; data: string };
export type DnsResult = {
  ok: boolean;
  status: number; // DoH response code: 0 = NOERROR, 3 = NXDOMAIN
  answers: DnsAnswer[];
  note: string;
  ms: number;
};

const TYPE_NAMES: Record<number, string> = { 1: 'A', 5: 'CNAME', 6: 'SOA', 15: 'MX', 16: 'TXT', 28: 'AAAA', 257: 'CAA' };

export function typeName(t: number): string {
  return TYPE_NAMES[t] ?? `TYPE${t}`;
}

export async function resolve(host: string, type: 'A' | 'AAAA' | 'CNAME' | 'TXT' = 'A'): Promise<DnsResult> {
  const started = Date.now();
  const name = host.replace(/^https?:\/\//, '').split('/')[0].replace(/\.$/, '');
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { accept: 'application/dns-json' },
    });
    if (!res.ok) {
      return { ok: false, status: res.status, answers: [], note: `DNS resolver returned HTTP ${res.status}`, ms: Date.now() - started };
    }
    const data: any = await res.json();
    const answers: DnsAnswer[] = (data.Answer ?? []).map((a: any) => ({ name: a.name, type: a.type, TTL: a.TTL, data: a.data }));
    const ok = (data.Status ?? 1) === 0 && answers.length > 0;
    return {
      ok,
      status: data.Status ?? 0,
      answers,
      note: ok
        ? answers.map((a) => `${typeName(a.type)} ${a.data}`).join(', ').slice(0, 300)
        : data.Status === 3
          ? 'NXDOMAIN — the record does not exist yet'
          : 'No records returned yet',
      ms: Date.now() - started,
    };
  } catch (err) {
    return { ok: false, status: -1, answers: [], note: `Lookup failed: ${String((err as Error)?.message ?? err).slice(0, 160)}`, ms: Date.now() - started };
  }
}

export type DnsVerdict = {
  ok: boolean;
  level: 'ok' | 'warn' | 'err';
  headline: string;
  detail: string;
  records: string[];
};

/**
 * Checks a host against the expectation for a panel-managed site:
 *  - CNAME (or A/AAAA) pointing somewhere
 *  - TXT `_ams-verify.<host>` matching the verification token (proves control)
 *
 * Cloudflare Workers sites are usually CNAMEs to `*.workers.dev` or an A/AAAA
 * pair proxied by Cloudflare; both are accepted.
 */
export async function verifyHost(host: string, token: string, expect?: string): Promise<DnsVerdict> {
  const [a, cname, txt] = await Promise.all([resolve(host, 'A'), resolve(host, 'CNAME'), resolve(`_ams-verify.${host}`, 'TXT')]);
  const records: string[] = [];
  for (const ans of [...cname.answers, ...a.answers]) records.push(`${typeName(ans.type)} ${ans.data}`);
  for (const ans of txt.answers) records.push(`TXT ${ans.data.replace(/^"|"$/g, '')}`);

  if (!a.ok && !cname.ok) {
    return {
      ok: false,
      level: 'err',
      headline: 'Host does not resolve',
      detail: `No A or CNAME record found for ${host}. Add a CNAME (or A/AAAA) record at your registrar / Cloudflare DNS, then verify again.`,
      records,
    };
  }
  const txtMatch = txt.answers.some((ans) => ans.data.replace(/"/g, '').trim() === token || ans.data.includes(token));
  if (expect && expect !== host) {
    const pointsAtExpect = [...cname.answers, ...a.answers].some((ans) => ans.data.replace(/\.$/, '') === expect);
    if (!pointsAtExpect) {
      return {
        ok: false,
        level: 'warn',
        headline: `Resolves, but not to ${expect}`,
        detail: `The record exists but points elsewhere. Expected a CNAME to ${expect}. Current: ${records.join(', ') || 'none'}.`,
        records,
      };
    }
  }
  if (!txtMatch) {
    return {
      ok: false,
      level: 'warn',
      headline: 'Resolves — ownership not proven',
      detail: `Add a TXT record named _ams-verify.${host} with the value ${token} to prove you control the domain. The site already serves traffic; this only unlocks the "verified" badge.`,
      records,
    };
  }
  return { ok: true, level: 'ok', headline: 'Verified and pointing correctly', detail: records.join(', '), records };
}
