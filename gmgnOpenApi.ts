/**
 * GMGN OpenAPI client — matches published gmgn-cli contract.
 * Base: https://openapi.gmgn.ai
 * Auth (market data): X-APIKEY header + timestamp + client_id query params
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { KlineDataPoint } from './src/types.js';

const GMGN_OPENAPI_BASE = 'https://openapi.gmgn.ai';

export function loadGmgnApiKey(): string | null {
  const envKey = process.env.GMGN_API_KEY || process.env.GMGN_APIKEY || '';
  if (envKey.trim()) return envKey.trim();

  const candidates = [
    path.join(process.env.HOME || '/root', '.config', 'gmgn', 'config.json'),
    '/root/.config/gmgn/config.json',
    path.join(process.cwd(), '.config', 'gmgn', 'config.json'),
  ];

  for (const configPath of candidates) {
    try {
      if (!fs.existsSync(configPath)) continue;
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg?.apiKey && typeof cfg.apiKey === 'string' && cfg.apiKey.trim()) {
        return cfg.apiKey.trim();
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

export type GmgnApiRequestOptions = {
  method?: 'GET' | 'POST';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  timeoutMs?: number;
};

export class GmgnApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'GmgnApiError';
    this.status = status;
    this.body = body;
  }
}

export async function gmgnApiRequest(
  endpoint: string,
  options: GmgnApiRequestOptions = {}
): Promise<any> {
  const apiKey = loadGmgnApiKey();
  if (!apiKey) {
    throw new GmgnApiError('NO_API_KEY', 401, { error: 'GMGN API key not configured' });
  }

  const clientId = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const query: Record<string, string> = {
    timestamp,
    client_id: clientId,
  };
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v === undefined || v === null) continue;
      query[k] = String(v);
    }
  }

  const qs = new URLSearchParams(query).toString();
  const url = `${GMGN_OPENAPI_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}?${qs}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);

  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'X-APIKEY': apiKey,
        'User-Agent': 'gmgn-ai-trader/3.2.0',
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }

    if (!res.ok) {
      throw new GmgnApiError(`GMGN_HTTP_${res.status}`, res.status, body);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

/** Normalize rank/trending payload into a flat array. */
export function normalizeRankRows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rank)) return data.rank;
  if (Array.isArray(data?.tokens)) return data.tokens;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.data?.rank)) return data.data.rank;
  if (Array.isArray(data?.data?.list)) return data.data.list;
  if (Array.isArray(data?.data?.tokens)) return data.data.tokens;
  return [];
}

/** Map OpenAPI kline candles into app KlineDataPoint shape. */
export function mapGmgnKlines(raw: any, count = 60): Array<{
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma7?: number;
  ma25?: number;
  smartMoneyBuy?: boolean;
  smartMoneySell?: boolean;
  kolCall?: boolean;
}> {
  let rows: any[] = [];
  if (Array.isArray(raw)) rows = raw;
  else if (Array.isArray(raw?.data)) rows = raw.data;
  else if (Array.isArray(raw?.list)) rows = raw.list;
  else if (Array.isArray(raw?.kline)) rows = raw.kline;
  else if (Array.isArray(raw?.candles)) rows = raw.candles;
  else if (Array.isArray(raw?.data?.list)) rows = raw.data.list;
  else if (Array.isArray(raw?.data?.kline)) rows = raw.data.kline;

  const mapped = rows.slice(-count).map((c: any) => {
    const time =
      typeof c.time === 'number'
        ? c.time > 1e12
          ? c.time
          : c.time * 1000
        : typeof c.t === 'number'
          ? c.t > 1e12
            ? c.t
            : c.t * 1000
          : typeof c.timestamp === 'number'
            ? c.timestamp > 1e12
              ? c.timestamp
              : c.timestamp * 1000
            : Date.now();

    const open = Number(c.open ?? c.o ?? 0);
    const high = Number(c.high ?? c.h ?? open);
    const low = Number(c.low ?? c.l ?? open);
    const close = Number(c.close ?? c.c ?? open);
    const volume = Number(c.volume ?? c.v ?? 0);

    const point: KlineDataPoint = {
      time,
      open,
      high,
      low,
      close,
      volume,
      smartMoneyBuy: false,
      smartMoneySell: false,
      kolCall: false,
    };
    return point;
  });

  for (let i = 0; i < mapped.length; i++) {
    if (i >= 6) {
      const slice7 = mapped.slice(i - 6, i + 1);
      mapped[i].ma7 = slice7.reduce((s, k) => s + k.close, 0) / 7;
    }
    if (i >= 24) {
      const slice25 = mapped.slice(i - 24, i + 1);
      mapped[i].ma25 = slice25.reduce((s, k) => s + k.close, 0) / 25;
    }
  }

  return mapped;
}

export async function fetchTrendingRank(opts: {
  chain?: string;
  interval?: string;
  limit?: number;
  orderBy?: string;
} = {}) {
  const data = await gmgnApiRequest('/v1/market/rank', {
    query: {
      chain: opts.chain || 'sol',
      interval: opts.interval || '1h',
      order_by: opts.orderBy || 'volume',
      limit: opts.limit ?? 30,
    },
  });
  return { raw: data, rows: normalizeRankRows(data) };
}

export async function fetchTokenKline(opts: {
  address: string;
  chain?: string;
  interval?: string;
  limit?: number;
}) {
  const data = await gmgnApiRequest('/v1/market/token_kline', {
    query: {
      chain: opts.chain || 'sol',
      address: opts.address,
      interval: opts.interval || '5m',
      limit: opts.limit ?? 60,
    },
  });
  return { raw: data, klines: mapGmgnKlines(data, opts.limit ?? 60) };
}
