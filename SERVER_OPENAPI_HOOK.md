# Wire GMGN OpenAPI into server.ts

`gmgnOpenApi.ts` + `gmgnOpenApiRoutes.ts` are already on `main`.

Apply this **once** in `server.ts`:

## 1. Import (near other imports)

```ts
import { registerGmgnOpenApiRoutes } from './gmgnOpenApiRoutes.js';
```

## 2. Register (immediately after `app.use(express.json());`)

```ts
// Live OpenAPI kline + trending (replaces old /api/gmgn/kline)
registerGmgnOpenApiRoutes(app, { generateKlineData });
```

> **Order matters:** `generateKlineData` is declared later in the file. Either:
> - move the `registerGmgnOpenApiRoutes(...)` call to **after** the `generateKlineData` function definition, or
> - keep the call where it is and change `generateKlineData` to a `function` declaration (hoisted) — it already is a `function`, so hoisting works. Safe to place the register call right after `app.use(express.json())`.

## 3. Remove the old kline route

Delete this block so the OpenAPI handler owns the path:

```ts
// API ROUTE 3: K-Line Candlestick Endpoint
app.get('/api/gmgn/kline', (req, res) => {
  const symbol = (req.query.symbol as string) || 'NEURAL';
  const interval = (req.query.interval as KlineInterval) || '5m';
  const klines = generateKlineData(symbol, interval, 60);
  res.json({
    symbol,
    interval,
    count: klines.length,
    data: klines,
  });
});
```

## Smoke tests (on your host, not the sandbox)

```bash
curl "http://localhost:3000/api/gmgn/tokens/trending-real?chain=sol&interval=1h"
curl "http://localhost:3000/api/gmgn/kline?symbol=NEURAL&interval=5m&address=<MINT>"
```

Responses include `source: "gmgn-openapi"` on success or `source: "simulated"` / error payload when the key/network fails.
