/**
 * Mount GMGN OpenAPI-backed routes on the Express app.
 *
 * Wire once in server.ts (after app.use(express.json())):
 *
 *   import { registerGmgnOpenApiRoutes } from './gmgnOpenApiRoutes.js';
 *   registerGmgnOpenApiRoutes(app, { generateKlineData });
 *
 * And DELETE or comment out the old synchronous /api/gmgn/kline handler
 * so this async one owns the path.
 */
import type { Express, Request, Response } from 'express';
import {
  fetchTokenKline,
  fetchTrendingRank,
  GmgnApiError,
  loadGmgnApiKey,
} from './gmgnOpenApi.js';

type KlineInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | string;

type GenerateKlineFn = (
  symbol: string,
  interval?: KlineInterval,
  count?: number
) => Array<{
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
}>;

export function registerGmgnOpenApiRoutes(
  app: Express,
  deps: { generateKlineData: GenerateKlineFn }
) {
  const { generateKlineData } = deps;

  // Live kline with labeled simulated fallback
  app.get('/api/gmgn/kline', async (req: Request, res: Response) => {
    const symbol = (req.query.symbol as string) || 'NEURAL';
    const interval = ((req.query.interval as string) || '5m') as KlineInterval;
    const address = (req.query.address as string) || (req.query.token as string) || '';

    if (address && loadGmgnApiKey()) {
      try {
        const { klines } = await fetchTokenKline({
          address,
          chain: (req.query.chain as string) || 'sol',
          interval: String(interval),
          limit: 60,
        });
        if (klines.length > 0) {
          return res.json({
            symbol,
            address,
            interval,
            count: klines.length,
            source: 'gmgn-openapi',
            data: klines,
          });
        }
      } catch (err: any) {
        const status = err instanceof GmgnApiError ? err.status : 0;
        console.warn(
          `[kline] OpenAPI miss (${status || err?.message || err}) — falling back to simulated`
        );
      }
    }

    const klines = generateKlineData(symbol, interval, 60);
    return res.json({
      symbol,
      address: address || null,
      interval,
      count: klines.length,
      source: 'simulated',
      data: klines,
    });
  });

  // Genuine trending rank from GET /v1/market/rank
  app.get('/api/gmgn/tokens/trending-real', async (req: Request, res: Response) => {
    const chain = (req.query.chain as string) || 'sol';
    const interval = (req.query.interval as string) || '1h';
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));

    if (!loadGmgnApiKey()) {
      return res.status(401).json({
        error: 'GMGN API key not configured',
        hint: 'Set GMGN_API_KEY env or run: gmgn-cli config --apply <key>',
        source: 'none',
      });
    }

    try {
      const { rows, raw } = await fetchTrendingRank({ chain, interval, limit });
      return res.json({
        chain,
        interval,
        count: rows.length,
        source: 'gmgn-openapi',
        tokens: rows,
        rawKeys: raw && typeof raw === 'object' ? Object.keys(raw) : [],
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      const status = err instanceof GmgnApiError ? err.status : 502;
      const body = err instanceof GmgnApiError ? err.body : { message: String(err?.message || err) };
      return res.status(status >= 400 && status < 600 ? status : 502).json({
        error: err?.message || 'OpenAPI request failed',
        status,
        body,
        source: 'gmgn-openapi-error',
      });
    }
  });
}
