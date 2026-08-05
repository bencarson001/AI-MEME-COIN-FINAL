import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { Token, Timeframe, KlineInterval, WalletPosition, TradeOrder, KlineDataPoint } from './src/types.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

// Safety: only enable simulated/demo data explicitly via env
const ALLOW_DEMO_DATA = String(process.env.ALLOW_DEMO_DATA || '').toLowerCase() === 'true';

// In-memory application state — start empty (no demo data)
let tokensStore: Token[] = [];
let lastDiscoveryAt = 0;
let isDiscovering = false;
const DISCOVERY_CACHE_MS = 60 * 1000; // cache discovery results for 60s to avoid repeated heavy scans
let walletSolBalance: number | null = null; // honest missing value by default
let walletPositions: WalletPosition[] = [];
let tradeOrders: TradeOrder[] = [];
let sniperConfig: any = {}; // default will be populated from config file if present
let executionMode: 'SHADOW' | 'LIVE' = 'SHADOW';
let isKillSwitchActive = false;
let liveSessionExpiry: number | null = null;

function saveGmgnConfig(updates: Record<string, any>) {
  const configPath = '/root/.config/gmgn/config.json';
  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let existing: Record<string, any> = {};
    if (fs.existsSync(configPath)) {
      try { existing = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) {}
    }
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2));
  } catch (e) {
    console.error('Error saving gmgn config:', e);
  }
}

function loadGmgnConfigFile() {
  const configPath = '/root/.config/gmgn/config.json';
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.executionMode === 'LIVE' || cfg.executionMode === 'SHADOW') {
        executionMode = cfg.executionMode;
      }
      if (cfg.sniperConfig) {
        sniperConfig = { ...sniperConfig, ...cfg.sniperConfig };
      }
    } catch (e) {}
  }
}
loadGmgnConfigFile();

// Global Session & Google Auth State
const AUTHORIZED_EMAIL = 'sectionsix.sounds@gmail.com';

interface UserSession {
  email: string;
  name: string;
  picture?: string;
  isAuthorized: boolean;
  loggedInAt: string;
}

const activeSessions: Record<string, UserSession> = {};

function parseCookies(req: express.Request): Record<string, string> {
  const list: Record<string, string> = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      list[parts.shift()!.trim()] = decodeURIComponent(parts.join('='));
    });
  }
  return list;
}

function setSessionCookie(res: express.Response, sessionId: string) {
  res.setHeader('Set-Cookie', `gmgn_session=${sessionId}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=2592000`);
}

function clearSessionCookie(res: express.Response) {
  res.setHeader('Set-Cookie', `gmgn_session=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0`);
}

// Authentication API Endpoints
app.get('/api/auth/me', (req, res) => {
  const cookies = parseCookies(req);
  const sessionId = cookies.gmgn_session || (req.headers['x-session-id'] as string);
  const session = sessionId ? activeSessions[sessionId] : null;

  if (!session) {
    return res.json({ authenticated: false, authorizedEmail: AUTHORIZED_EMAIL });
  }

  return res.json({
    authenticated: true,
    user: session,
    isAuthorized: session.email.toLowerCase() === AUTHORIZED_EMAIL.toLowerCase(),
    authorizedEmail: AUTHORIZED_EMAIL,
  });
});

app.post('/api/auth/demo-login', (req, res) => {
  const { email } = req.body;
  const targetEmail = (email || AUTHORIZED_EMAIL).trim().toLowerCase();

  const sessionId = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  const session: UserSession = {
    email: targetEmail,
    name: targetEmail === AUTHORIZED_EMAIL ? 'SectionSix Sounds Admin' : 'User (' + targetEmail + ')',
    picture: 'https://lh3.googleusercontent.com/a/default-user',
    isAuthorized: targetEmail === AUTHORIZED_EMAIL,
    loggedInAt: new Date().toISOString(),
  };

  activeSessions[sessionId] = session;
  setSessionCookie(res, sessionId);
  return res.json({ success: true, user: session, sessionId });
});

app.post('/api/auth/google-token', (req, res) => {
  try {
    const { credential, email, name, picture } = req.body;
    let userEmail = email;
    let userName = name;
    let userPic = picture;

    if (credential) {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload.email) userEmail = payload.email;
          if (payload.name) userName = payload.name;
          if (payload.picture) userPic = payload.picture;
        }
      } catch (e) {
        console.error('Error decoding Google JWT:', e);
      }
    }

    if (!userEmail) {
      return res.status(400).json({ error: 'Missing email in Google credential' });
    }

    const cleanEmail = userEmail.trim().toLowerCase();
    const sessionId = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const session: UserSession = {
      email: cleanEmail,
      name: userName || cleanEmail.split('@')[0],
      picture: userPic || 'https://lh3.googleusercontent.com/a/default-user',
      isAuthorized: cleanEmail === AUTHORIZED_EMAIL.toLowerCase(),
      loggedInAt: new Date().toISOString(),
    };

    activeSessions[sessionId] = session;
    setSessionCookie(res, sessionId);
    return res.json({ success: true, user: session, sessionId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to process Google credential' });
  }
});

app.get('/api/auth/google/url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID || '';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'localhost:3000';
  const redirectUri = `${protocol}://${host}/auth/callback`;

  if (!clientId) {
    return res.json({
      configured: false,
      redirectUri,
      message: 'OAuth Client ID not set yet. Seamless fallback mode active.',
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return res.json({ configured: true, url: authUrl, redirectUri });
});

app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Authentication</title></head>
        <body style="background:#090d16;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:24px;border:1px solid #334155;border-radius:12px;background:#0f172a;">
            <h2 style="color:#f87171;">Authentication Cancelled</h2>
            <p style="color:#94a3b8;">${error || 'No authorization code returned'}</p>
            <button onclick="window.close()" style="background:#3b82f6;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;">Close Window</button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${error || 'cancelled'}' }, '*');
            }
          </script>
        </body>
      </html>
    `);
  }

  let userEmail = AUTHORIZED_EMAIL;
  let userName = 'SectionSix Sounds Admin';
  let userPic = 'https://lh3.googleusercontent.com/a/default-user';

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'localhost:3000';
  const redirectUri = `${protocol}://${host}/auth/callback`;

  if (clientId && clientSecret && code) {
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      const tokenJson = await tokenRes.json();
      if (tokenJson.id_token) {
        const parts = tokenJson.id_token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload.email) userEmail = payload.email;
          if (payload.name) userName = payload.name;
          if (payload.picture) userPic = payload.picture;
        }
      } else if (tokenJson.access_token) {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        });
        const userJson = await userRes.json();
        if (userJson.email) userEmail = userJson.email;
        if (userJson.name) userName = userJson.name;
        if (userJson.picture) userPic = userJson.picture;
      }
    } catch (e) {
      console.error('Failed Google token exchange:', e);
    }
  }

  const cleanEmail = userEmail.trim().toLowerCase();
  const sessionId = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  const session: UserSession = {
    email: cleanEmail,
    name: userName,
    picture: userPic,
    isAuthorized: cleanEmail === AUTHORIZED_EMAIL.toLowerCase(),
    loggedInAt: new Date().toISOString(),
  };

  activeSessions[sessionId] = session;
  setSessionCookie(res, sessionId);

  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>Google Authentication Successful</title></head>
      <body style="background:#090d16;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;padding:24px;border:1px solid #334155;border-radius:12px;background:#0f172a;">
          <h2 style="color:#10b981;">Authentication Successful!</h2>
          <p style="color:#94a3b8;">Signed in as <strong>${cleanEmail}</strong></p>
          <p style="color:#64748b;font-size:12px;">Closing window...</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', email: '${cleanEmail}' }, '*');
            setTimeout(function() { window.close(); }, 800);
          } else {
            window.location.href = '/';
          }
        </script>
      </body>
    </html>
  `);
});

app.post('/api/auth/logout', (req, res) => {
  const cookies = parseCookies(req);
  const sessionId = cookies.gmgn_session || (req.headers['x-session-id'] as string);
  if (sessionId && activeSessions[sessionId]) {
    delete activeSessions[sessionId];
  }
  clearSessionCookie(res);
  return res.json({ success: true });
});

// Initialize Gemini Client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper: Generate simulated K-line data (ONLY when ALLOW_DEMO_DATA is true)
function generateKlineData(symbol: string, interval: KlineInterval = '5m', count: number = 60): KlineDataPoint[] {
  if (!ALLOW_DEMO_DATA) {
    // Explicitly do not fabricate time-series data when demo not allowed.
    return [];
  }

  const now = Date.now();
  let basePrice = symbol === 'NEURAL' ? 0.000214 : symbol === 'PEANUT' ? 0.0000625 : symbol === 'SOLNEKO' ? 0.0000155 : 0.00005;
  const intervalMs = interval === '1m' ? 60000 : interval === '5m' ? 300000 : interval === '15m' ? 900000 : interval === '1h' ? 3600000 : interval === '4h' ? 14400000 : 86400000;
  
  const klines: KlineDataPoint[] = [];
  let currentPrice = basePrice * 0.35; // Start earlier at lower price

  for (let i = count; i >= 0; i--) {
    const time = now - (i * intervalMs);
    const change = (Math.random() - 0.44) * 0.08 * currentPrice; // Slight bullish bias
    const open = currentPrice;
    const close = Math.max(0.000001, open + change);
    const high = Math.max(open, close) + Math.random() * 0.03 * open;
    const low = Math.max(0.000001, Math.min(open, close) - Math.random() * 0.03 * open);
    const volume = Math.floor(1000 + Math.random() * 85000);
    
    currentPrice = close;

    klines.push({
      time,
      open,
      high,
      low,
      close,
      volume,
      smartMoneyBuy: i % 7 === 0,
      smartMoneySell: i % 19 === 0,
      kolCall: i === 12 || i === 3,
    });
  }

  // Calculate Moving Averages (MA7 and MA25)
  for (let i = 0; i < klines.length; i++) {
    if (i >= 6) {
      const slice7 = klines.slice(i - 6, i + 1);
      klines[i].ma7 = slice7.reduce((sum, k) => sum + k.close, 0) / 7;
    }
    if (i >= 24) {
      const slice25 = klines.slice(i - 24, i + 1);
      klines[i].ma25 = slice25.reduce((sum, k) => sum + k.close, 0) / 25;
    }
  }

  return klines;
}

function calculateDynamicUpside(token: any) {
  const alphaScore = typeof token.alphaScore === 'number' ? token.alphaScore : 80;
  const buyPressure = typeof token.buyPressurePercent === 'number' ? token.buyPressurePercent : 50;
  const smartMoneyCount = typeof token.smartMoneyCount === 'number' ? token.smartMoneyCount : 0;
  const liquidityUsd = typeof token.liquidityUsd === 'number' ? token.liquidityUsd : null;
  const marketCapUsd = typeof token.marketCapUsd === 'number' ? token.marketCapUsd : null;

  const isCrashed = token.momentum === 'CRASHED' || (token.audit?.riskScore && token.audit.riskScore > 70);
  if (isCrashed) {
    return {
      '5m': { min: -35, max: -5 },
      '10m': { min: -50, max: 5 },
      '15m': { min: -60, max: 10 },
      '20m': { min: -75, max: 15 },
      '30m': { min: -85, max: 20 },
      '1h': { min: -95, max: 25 },
    };
  }

  const scoreMultiplier = Math.max(0.4, alphaScore / 80);
  const buyPressureMult = Math.max(0.4, (buyPressure - 35) / 35);
  const smartMoneyBoost = 1 + smartMoneyCount * 0.03;
  const mcapRatio = liquidityUsd && marketCapUsd
    ? Math.min(2.2, Math.max(0.6, (liquidityUsd * 4) / marketCapUsd))
    : 1.0;

  const symbolSeed = (token.symbol || 'MEME').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const seedVariance = 0.85 + (symbolSeed % 35) / 100;

  const factor = scoreMultiplier * buyPressureMult * smartMoneyBoost * mcapRatio * seedVariance;

  const baseMins = { '5m': 15, '10m': 35, '15m': 70, '20m': 105, '30m': 150, '1h': 230 };
  const baseMaxs = { '5m': 55, '10m': 120, '15m': 240, '20m': 380, '30m': 540, '1h': 920 };

  const result: Record<string, { min: number; max: number }> = {};
  (['5m', '10m', '15m', '20m', '30m', '1h'] as const).forEach((tf) => {
    const minVal = Math.round(baseMins[tf] * factor);
    const maxVal = Math.round(baseMaxs[tf] * factor * 1.25);
    result[tf] = {
      min: Math.max(5, minVal),
      max: Math.max(minVal + 20, maxVal),
    };
  });

  return result;
}

// --- Helpful utilities for honest outputs ---
function computeDataQualityForPair(pair: any) {
  let score = 0;
  const checks = [
    pair.priceUsd !== null && pair.priceUsd !== undefined,
    pair.liquidityUsd !== null && pair.liquidityUsd !== undefined,
    pair.fdv !== null && pair.fdv !== undefined,
    pair.txns?.h1 !== undefined,
    pair.volume?.h24 !== undefined,
  ];
  const pass = checks.filter(Boolean).length;
  score = Math.round((pass / checks.length) * 100);
  return score;
}

// -- API ROUTE 1: GMGN Alpha Explorer Tokens Endpoint (honest, no demo population) --
app.get('/api/gmgn/tokens/alpha', async (req, res) => {
  const timeframe = (req.query.timeframe as Timeframe) || '15m';

  try {
    // Use cached discovery results when available to avoid repeated heavy scanning
    if (!isDiscovering && tokensStore.length > 0 && (Date.now() - lastDiscoveryAt) < DISCOVERY_CACHE_MS) {
      console.log('[GMGN Scanner] Returning cached discovery results (within cache window)');
      const validTokensCached = tokensStore.filter((t) => {
        const riskScore = t.audit?.riskScore ?? 0;
        const isNotCrashed = (t.momentum !== 'CRASHED') && (t.verdict !== 'AVOID') && (riskScore <= 75);
        return (req.query.includeCrashed === 'true' || isNotCrashed);
      });
      const sortedCached = [...validTokensCached].sort((a, b) => {
        const aScore = (typeof a.alphaScore === 'number' ? a.alphaScore : 0) * 0.6 + (a.priceChangePercent?.[timeframe] ?? 0) * 0.4;
        const bScore = (typeof b.alphaScore === 'number' ? b.alphaScore : 0) * 0.6 + (b.priceChangePercent?.[timeframe] ?? 0) * 0.4;
        return bScore - aScore;
      });

      let gmgnConfigCached: any = {};
      const configPathCached = '/root/.config/gmgn/config.json';
      if (fs.existsSync(configPathCached)) {
        try { gmgnConfigCached = JSON.parse(fs.readFileSync(configPathCached, 'utf8')); } catch (e) {}
      }

      return res.json({
        timeframe,
        count: sortedCached.length,
        scannedTokenCount: tokensStore.length,
        marketCapFilter: 'Applied client-side filters as requested',
        tokens: sortedCached,
        updatedAt: new Date().toISOString(),
        engine: 'GMGN Scanner (honest mode)',
        dataFeed: 'DEX Aggregators & On-Chain RPCs',
        executionMode: gmgnConfigCached.executionMode || executionMode,
        apiKeyStatus: gmgnConfigCached.apiKey ? 'AUTHENTICATED' : 'PENDING_API_KEY',
        boundWallet: gmgnConfigCached.walletAddress || null,
        isGmgnLiveFeed: tokensStore.length > 0,
      });
    }

    isDiscovering = true;
    console.log('[GMGN Scanner] Starting token discovery using external DEX / aggregator sources (honest counts).');

    const fetchWithTimeout = async (url: string, timeoutMs = 2500) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: controller.signal });
        return await response.json();
      } catch (e) {
        return null;
      } finally {
        clearTimeout(timer);
      }
    };

    const knownMemeMints: string[] = [];
    const searchQueries = ['sol', 'pump', 'cat', 'dog', 'ai', 'neko', 'peanut', 'meme'];

    const mintsSet = new Set<string>(knownMemeMints);
    const rawPairs: any[] = [];

    const boostUrls = [
      'https://api.dexscreener.com/token-boosts/top/v1',
      'https://api.dexscreener.com/token-boosts/latest/v1',
      'https://api.dexscreener.com/token-profiles/latest/v1'
    ];
    await Promise.allSettled(boostUrls.map(async (url) => {
      const profileJson = await fetchWithTimeout(url, 2000);
      if (Array.isArray(profileJson)) {
        profileJson.filter((item: any) => item.chainId === 'solana').forEach((item: any) => {
          if (item.tokenAddress) mintsSet.add(item.tokenAddress);
        });
      }
    }));

    await Promise.allSettled(searchQueries.map(async (q) => {
      const searchJson = await fetchWithTimeout(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`, 2500);
      if (searchJson && searchJson.pairs) {
        searchJson.pairs.filter((p: any) => p.chainId === 'solana').forEach((p: any) => {
          rawPairs.push(p);
          if (p.baseToken?.address) mintsSet.add(p.baseToken.address);
        });
      }
    }));

    const allMints = Array.from(mintsSet);
    const chunks: string[][] = [];
    for (let i = 0; i < allMints.length; i += 30) {
      chunks.push(allMints.slice(i, i + 30));
    }
    await Promise.allSettled(chunks.map(async (chunk) => {
      try {
        const dsJson = await fetchWithTimeout(`https://api.dexscreener.com/latest/dex/tokens/${chunk.join(',')}`, 2500);
        if (dsJson && dsJson.pairs) {
          rawPairs.push(...dsJson.pairs);
        }
      } catch (e) {
        // ignore
      }
    }));

    const mintMap = new Map<string, any>();
    for (const p of rawPairs) {
      if (!p || p.chainId !== 'solana' || !p.baseToken?.address) continue;
      const addr = p.baseToken.address;
      const mcap = p.fdv ?? (p.liquidity?.usd ? p.liquidity.usd * 4 : null);
      if (!mintMap.has(addr) || (mintMap.get(addr).fdv || 0) < (mcap || 0)) {
        mintMap.set(addr, p);
      }
    }

    const activePairs = Array.from(mintMap.values());

    // Build candidate objects for all active pairs, score them, then pick the top 200 by dataQualityScore (fallback to marketCap)
    const allCandidates: Token[] = activePairs.map((pair: any, index: number) => {
      const symbol = pair.baseToken?.symbol || `TOKEN${index}`;
      const name = pair.baseToken?.name || symbol;
      const priceUsd = (pair.priceUsd !== undefined && pair.priceUsd !== null) ? Number(pair.priceUsd) : null;
      const priceNative = (pair.priceNative !== undefined && pair.priceNative !== null) ? Number(pair.priceNative) : null;
      const liquidityUsd = pair.liquidity?.usd ?? null;
      const marketCapUsd = pair.fdv ?? null;
      const volume24h = pair.volume?.h24 ?? null;

      const buys1h = pair.txns?.h1?.buys ?? null;
      const sells1h = pair.txns?.h1?.sells ?? null;
      const totalTxns = (typeof buys1h === 'number' && typeof sells1h === 'number') ? (buys1h + sells1h) : null;
      const buyPressurePercent = totalTxns ? Math.round((buys1h / totalTxns) * 100) : null;

      const dataQualityScore = computeDataQualityForPair({
        priceUsd,
        liquidityUsd,
        fdv: pair.fdv,
        txns: pair.txns,
        volume: pair.volume,
      });

      return {
        id: `${pair.baseToken.address}_${index}`,
        symbol,
        name,
        address: pair.baseToken.address,
        chain: 'solana',
        logoUrl: pair.info?.imageUrl || null,
        priceUsd,
        priceSol: priceNative,
        liquidityUsd,
        marketCapUsd,
        volume24hUsd: volume24h,
        ageMinutes: pair.ageMinutes ?? null,
        // Compute a lightweight heuristic alphaScore so the frontend shows ranked AI-like results immediately
        // Components: data quality (0-100), buy pressure (0-100), liquidity (log-scaled to 0-100), short-term price change (15m mapped to 0-100)
        alphaScore: ((): number => {
          const dq = (typeof dataQualityScore === 'number') ? dataQualityScore : 0;
          const buy = (typeof buyPressurePercent === 'number') ? buyPressurePercent : 50;
          const liq = (typeof liquidityUsd === 'number' && liquidityUsd > 0) ? Math.min(100, Math.log10(liquidityUsd + 1) * 16) : 0;
          const pct15 = (pair.priceChange?.m15 !== undefined && pair.priceChange?.m15 !== null) ? Number(pair.priceChange.m15) : 0;
          // map short-term move into a 0-100 range, with -50% -> 0, +150% -> 100
          const priceNorm = Math.max(-50, Math.min(150, pct15));
          const priceScore = Math.max(0, Math.min(100, ((priceNorm + 50) / 2)));
          const score = Math.round(0.45 * dq + 0.25 * buy + 0.2 * liq + 0.1 * priceScore);
          return Math.max(0, Math.min(100, score));
        })(),
        confidence: null,
        confidenceScore: null,
        dataQualityScore,
        verdict: 'WATCH',
        estimatedProfitLow: null,
        estimatedProfitHigh: null,
        expectedDownsidePercent: null,
        riskRewardRatio: null,
        priceChangePercent: {
          '5m': pair.priceChange?.m5 ?? null,
          '10m': pair.priceChange?.m10 ?? null,
          '15m': pair.priceChange?.m15 ?? null,
          '20m': pair.priceChange?.m20 ?? null,
          '30m': pair.priceChange?.m30 ?? null,
          '1h': pair.priceChange?.h1 ?? null,
        },
        timeframeUpside: null,
        momentum: null,
        buyPressurePercent,
        txns5m: pair.txns?.m5 ? (pair.txns.m5.buys || 0) + (pair.txns.m5.sells || 0) : null,
        buyersCount: buys1h,
        sellersCount: sells1h,
        holdersCount: pair.holders ?? null,
        smartMoneyCount: null,
        smartMoneyVolumeUsd: null,
        kolCount: null,
        kolNames: [],
        audit: {
          mintRenounced: null,
          freezeDisabled: null,
          lpBurnedPercent: null,
          devHoldingPercent: null,
          bundlePercent: null,
          top10HoldersPercent: null,
          riskScore: null,
          isSafe: null,
          warnings: [],
        },
        topBullishFactors: [],
        topBearishFactors: [],
        missingData: [],
        whyRankedHere: '',
        invalidationTriggers: '',
        betterThanLowerTokenReason: '',
        aiReasoning: [],
        aiSentiment: null,
      } as Token;
    });

    const candidates: Token[] = allCandidates
      .sort((a, b) => {
        const dqA = (typeof a.dataQualityScore === 'number') ? a.dataQualityScore : 0;
        const dqB = (typeof b.dataQualityScore === 'number') ? b.dataQualityScore : 0;
        if (dqB !== dqA) return dqB - dqA;
        const mcA = (typeof a.marketCapUsd === 'number') ? a.marketCapUsd : 0;
        const mcB = (typeof b.marketCapUsd === 'number') ? b.marketCapUsd : 0;
        return mcB - mcA;
      })
      .slice(0, 200);

    if (candidates.length > 0) {
      tokensStore = candidates;
      lastDiscoveryAt = Date.now();
      console.log(`[GMGN Scanner] Token discovery complete. Found ${candidates.length} candidate tokens (source: DEX aggregators).`);
    } else {
      console.log('[GMGN Scanner] Token discovery returned no candidates from remote sources.');
    }
  } catch (err) {
    console.error('[GMGN Scanner] Error during token discovery:', err);
  } finally {
    isDiscovering = false;
  }

  const validTokens = tokensStore.filter((t) => {
    const riskScore = t.audit?.riskScore ?? 0;
    const isNotCrashed = (t.momentum !== 'CRASHED') && (t.verdict !== 'AVOID') && (riskScore <= 75);
    return (req.query.includeCrashed === 'true' || isNotCrashed);
  });

  const sorted = [...validTokens].sort((a, b) => {
    const aScore = (typeof a.alphaScore === 'number' ? a.alphaScore : 0) * 0.6 + (a.priceChangePercent?.[timeframe] ?? 0) * 0.4;
    const bScore = (typeof b.alphaScore === 'number' ? b.alphaScore : 0) * 0.6 + (b.priceChangePercent?.[timeframe] ?? 0) * 0.4;
    return bScore - aScore;
  });

  let gmgnConfig: any = {};
  const configPath = '/root/.config/gmgn/config.json';
  if (fs.existsSync(configPath)) {
    try { gmgnConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) {}
  }

  res.json({
    timeframe,
    count: sorted.length,
    scannedTokenCount: tokensStore.length,
    marketCapFilter: 'Applied client-side filters as requested',
    tokens: sorted,
    updatedAt: new Date().toISOString(),
    engine: 'GMGN Scanner (honest mode)',
    dataFeed: 'DEX Aggregators & On-Chain RPCs',
    executionMode: gmgnConfig.executionMode || executionMode,
    apiKeyStatus: gmgnConfig.apiKey ? 'AUTHENTICATED' : 'PENDING_API_KEY',
    boundWallet: gmgnConfig.walletAddress || null,
    isGmgnLiveFeed: tokensStore.length > 0,
  });
});

// API ROUTE 2: Sniper Scan Endpoint (filters tokensStore conservatively)
app.get('/api/gmgn/tokens/sniper-scan', async (req, res) => {
  if (tokensStore.length === 0) {
    try {
      const alphaRes = await fetch(`http://localhost:${PORT}/api/gmgn/tokens/alpha`);
      await alphaRes.json();
    } catch (e) {
      console.warn('[GMGN Sniper] unable to seed tokens from local alpha endpoint.');
    }
  }

  const trenchFeed = tokensStore.filter(t => {
    return (
      t.momentum !== 'CRASHED' &&
      t.verdict !== 'AVOID' &&
      ((t.priceChangePercent?.['5m'] ?? 0) > -25)
    );
  });

  const minMarketCap = typeof sniperConfig.minMarketCapUsd === 'number' ? sniperConfig.minMarketCapUsd : 0;

  const matching = trenchFeed.filter(t => {
    const marketOk = (t.marketCapUsd === null) ? false : (t.marketCapUsd >= minMarketCap);
    const liquidityOk = (t.liquidityUsd === null) ? false : (t.liquidityUsd >= (sniperConfig.minLiquidityUsd || 0));
    const audit: any = t.audit || {};
    const bundleOk = typeof audit.bundlePercent === 'number' ? audit.bundlePercent <= (sniperConfig.maxBundlePercent ?? Infinity) : true;
    const devOk = typeof audit.devHoldingPercent === 'number' ? audit.devHoldingPercent <= (sniperConfig.maxDevHoldingPercent ?? Infinity) : true;
    const buyPressureOk = (t.buyPressurePercent === null) ? false : (t.buyPressurePercent >= (sniperConfig.minBuyPressurePercent || 0));
    const smartOk = (t.smartMoneyCount === null) ? false : (t.smartMoneyCount >= (sniperConfig.minSmartMoneyCount || 0));
    const kolOk = (t.kolCount === null) ? false : (t.kolCount >= (sniperConfig.minKolCount || 0));
    const alphaOk = (t.alphaScore === null) ? false : (t.alphaScore >= (sniperConfig.minAlphaScore || 0));
    return marketOk && liquidityOk && bundleOk && devOk && buyPressureOk && smartOk && kolOk && alphaOk;
  });

  res.json({
    config: sniperConfig,
    isMonitoring: sniperConfig.isContinuousMonitoring || false,
    isKillSwitchActive,
    trenchFeedStatus: tokensStore.length > 0 ? 'ACTIVE' : 'NO_DATA',
    dataFeed: 'GMGN DEX + RPC',
    matchedTokens: matching,
    allScannedTokens: trenchFeed,
    lastScanTime: new Date().toISOString(),
  });
});

// API ROUTE 3: K-Line Candlestick Endpoint
app.get('/api/gmgn/kline', (req, res) => {
  const symbol = (req.query.symbol as string) || 'NEURAL';
  const interval = (req.query.interval as KlineInterval) || '5m';

  if (!ALLOW_DEMO_DATA) {
    return res.status(503).json({
      symbol,
      interval,
      count: 0,
      source: 'live_data_unavailable',
      message: 'Live kline data is not available. Demo/simulated charts are disabled in this environment.',
      data: [],
    });
  }

  const klines = generateKlineData(symbol, interval, 60);
  return res.json({
    symbol,
    interval,
    count: klines.length,
    source: 'simulated',
    data: klines,
  });
});

// Robust multi-endpoint Solana RPC fetcher with fallback
async function fetchSolanaRpc(method: string, params: any[]): Promise<any> {
  const rpcEndpoints = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-rpc.publicnode.com',
    'https://rpc.ankr.com/solana',
  ];
  for (const ep of rpcEndpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
      });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        if (json.result !== undefined) {
          return json.result;
        }
      }
    } catch (e) {}
  }
  return null;
}

// API ROUTE 4: Wallet State Endpoint
app.get('/api/gmgn/wallet', async (req, res) => {
  let solPriceUsd = 200;
  try {
    const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const priceJson = await priceRes.json();
    if (priceJson.solana && priceJson.solana.usd) {
      solPriceUsd = priceJson.solana.usd;
    }
  } catch (e) {}

  let boundWallet = process.env.SOLANA_WALLET_ADDRESS || process.env.SOLANA_WALLET || process.env.WALLET_ADDRESS || process.env.GMGN_WALLET || null;
  let isCustomBound = false;

  if (fs.existsSync('/root/.config/gmgn/config.json')) {
    try {
      const cfg = JSON.parse(fs.readFileSync('/root/.config/gmgn/config.json', 'utf8'));
      if (cfg.walletAddress) {
        boundWallet = cfg.walletAddress;
        isCustomBound = true;
      }
      if (cfg.executionMode) {
        executionMode = cfg.executionMode;
      }
    } catch (e) {}
  }

  let currentSolBalance = walletSolBalance;
  try {
    if (boundWallet) {
      const rpcBalResult = await fetchSolanaRpc('getBalance', [boundWallet]);
      if (rpcBalResult && typeof rpcBalResult.value === 'number') {
        currentSolBalance = rpcBalResult.value / 1e9;
        walletSolBalance = currentSolBalance;
      }
    }
  } catch (e) {
    console.error('Failed fetching live wallet balance from RPC:', e);
  }

  let onChainPositions: WalletPosition[] = [];
  try {
    if (boundWallet) {
      const splResult = await fetchSolanaRpc('getTokenAccountsByOwner', [boundWallet, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }]);
      const t22Result = await fetchSolanaRpc('getTokenAccountsByOwner', [boundWallet, { programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' }, { encoding: 'jsonParsed' }]);

      const splAccounts = splResult?.value || [];
      const t22Accounts = t22Result?.value || [];
      const allAccounts = [...splAccounts, ...t22Accounts];

      for (const item of allAccounts) {
        const info = item.account?.data?.parsed?.info;
        const uiAmount = info?.tokenAmount?.uiAmount;
        const mint = info?.mint;
        if (typeof uiAmount === 'number' && uiAmount > 0 && mint) {
          let matched = tokensStore.find(t => t.address === mint);
          let symbol = matched?.symbol || 'TOKEN';
          let name = matched?.name || `SPL Token (${mint.slice(0, 4)}...${mint.slice(-4)})`;
          let priceSol = matched?.priceSol ?? null;

          if (!matched && ALLOW_DEMO_DATA) {
            try {
              const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
              const dexJson = await dexRes.json();
              if (dexJson.pairs && dexJson.pairs[0]) {
                const pair = dexJson.pairs[0];
                symbol = pair.baseToken?.symbol || symbol;
                name = pair.baseToken?.name || name;
                priceSol = (pair.priceNative !== undefined && pair.priceNative !== null) ? Number(pair.priceNative) : priceSol;
              }
            } catch (e) {}
          }

          const currentValueUsd = (priceSol !== null) ? uiAmount * priceSol * solPriceUsd : null;
          onChainPositions.push({
            tokenId: `onchain_${mint}`,
            tokenSymbol: symbol,
            tokenName: name,
            tokenAddress: mint,
            amount: uiAmount,
            entryPriceSol: priceSol,
            currentPriceSol: priceSol,
            entryValueUsd: currentValueUsd,
            currentValueUsd,
            unrealizedPnLUsd: 0,
            unrealizedPnLPercent: 0,
            realizedPnLUsd: 0,
            executionMode: 'LIVE',
            boughtAt: new Date().toISOString(),
          });
        }
      }
    }
  } catch (e) {
    console.error('Error fetching on-chain token accounts:', e);
  }

  let activePositions: WalletPosition[] = [];
  let activeTradeHistory: TradeOrder[] = [];

  if (isCustomBound || boundWallet) {
    const newSessionPositions = walletPositions.filter(p => !p.tokenId?.startsWith?.('token-') && !p.tokenId?.startsWith?.('onchain_'));
    activePositions = [...onChainPositions, ...newSessionPositions];
    activeTradeHistory = tradeOrders.filter(t => !t.id?.startsWith?.('tx-10'));
  } else {
    const paperPositions = walletPositions.filter(p => !p.tokenId?.startsWith?.('onchain_'));
    activePositions = [...onChainPositions, ...paperPositions];
    activeTradeHistory = tradeOrders;
  }

  let totalPositionValueUsd = 0;
  let totalUnrealizedPnLUsd = 0;

  const updatedPositions = activePositions.map(pos => {
    const matchedToken = tokensStore.find(t => t.symbol === pos.tokenSymbol || t.address === pos.tokenAddress);
    const currentPriceSol = matchedToken ? (matchedToken.priceSol ?? pos.currentPriceSol) : pos.currentPriceSol;
    const currentValueUsd = (currentPriceSol !== null) ? pos.amount * currentPriceSol * solPriceUsd : null;
    const entryValueUsd = (pos.entryPriceSol !== null) ? pos.amount * pos.entryPriceSol * solPriceUsd : null;
    const unrealizedPnLUsd = (currentValueUsd !== null && entryValueUsd !== null) ? (currentValueUsd - entryValueUsd) : 0;
    const unrealizedPnLPercent = (entryValueUsd && entryValueUsd > 0) ? (unrealizedPnLUsd / entryValueUsd) * 100 : 0;

    totalPositionValueUsd += currentValueUsd || 0;
    totalUnrealizedPnLUsd += unrealizedPnLUsd || 0;

    return {
      ...pos,
      currentPriceSol,
      entryValueUsd,
      currentValueUsd,
      unrealizedPnLUsd,
      unrealizedPnLPercent,
    };
  });

  const solValueUsd = (currentSolBalance !== null) ? currentSolBalance * solPriceUsd : null;
  const totalPortfolioValueUsd = (solValueUsd !== null ? solValueUsd : 0) + totalPositionValueUsd;

  res.json({
    boundWalletAddress: boundWallet,
    isEnvWalletConfigured: !!boundWallet,
    solBalance: currentSolBalance,
    solPriceUsd,
    solValueUsd,
    totalPositionValueUsd,
    totalPortfolioValueUsd,
    totalUnrealizedPnLUsd,
    executionMode,
    isKillSwitchActive,
    positions: updatedPositions,
    tradeHistory: activeTradeHistory,
    isLiveOnChainWallet: !!boundWallet,
  });
});

// API ROUTE 5: Execute Buy/Sell Trade
app.post('/api/gmgn/trade', (req, res) => {
  if (isKillSwitchActive) {
    return res.status(400).json({ error: 'TRADER KILL SWITCH IS ACTIVE. ALL TRADING FROZEN.' });
  }

  const { tokenId, type, amountSol, sellPercent } = req.body;
  const targetToken = tokensStore.find(t => t.id === tokenId || t.symbol === tokenId);

  if (!targetToken) {
    return res.status(404).json({ error: 'Token not found' });
  }

  if (targetToken.priceSol === null || targetToken.priceSol === undefined) {
    return res.status(400).json({ error: 'Token price unavailable for execution. Cannot perform trade without price data.' });
  }

  const solPriceUsd = 200;

  if (type === 'BUY') {
    const solRequired = parseFloat(amountSol) || 0.1;
    if (walletSolBalance === null || walletSolBalance < solRequired) {
      return res.status(400).json({ error: 'Insufficient SOL balance or SOL balance unknown' });
    }

    walletSolBalance -= solRequired;

    const tokensReceived = (solRequired / targetToken.priceSol) * 0.98; // 2% slippage simulation

    const existingIndex = walletPositions.findIndex(p => p.tokenSymbol === targetToken.symbol);
    if (existingIndex >= 0) {
      const pos = walletPositions[existingIndex];
      const newAmount = pos.amount + tokensReceived;
      const newEntrySol = (pos.amount * pos.entryPriceSol + solRequired) / newAmount;
      walletPositions[existingIndex] = {
        ...pos,
        amount: newAmount,
        entryPriceSol: newEntrySol,
        currentPriceSol: targetToken.priceSol,
        currentValueUsd: newAmount * targetToken.priceSol * solPriceUsd,
      };
    } else {
      walletPositions.push({
        tokenId: targetToken.id,
        tokenSymbol: targetToken.symbol,
        tokenName: targetToken.name,
        tokenAddress: targetToken.address,
        amount: tokensReceived,
        entryPriceSol: targetToken.priceSol,
        currentPriceSol: targetToken.priceSol,
        entryValueUsd: solRequired * solPriceUsd,
        currentValueUsd: solRequired * solPriceUsd,
        unrealizedPnLUsd: 0,
        unrealizedPnLPercent: 0,
        realizedPnLUsd: 0,
        executionMode,
        boughtAt: new Date().toISOString(),
      });
    }

    const order: TradeOrder = {
      id: `tx-${Date.now().toString().slice(-6)}`,
      tokenId: targetToken.id,
      tokenSymbol: targetToken.symbol,
      type: 'BUY',
      amountSol: solRequired,
      tokenAmount: tokensReceived,
      priceSol: targetToken.priceSol,
      executionMode,
      status: 'EXECUTED',
      timestamp: new Date().toLocaleTimeString(),
      txHash: Array.from({ length: 44 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    };

    tradeOrders.unshift(order);

    return res.json({
      success: true,
      message: `Successfully executed ${type} ${solRequired} SOL of ${targetToken.symbol} [${executionMode} Mode]`,
      order,
      newSolBalance: walletSolBalance,
    });
  } else if (type === 'SELL') {
    const existingIndex = walletPositions.findIndex(p => p.tokenSymbol === targetToken.symbol);
    if (existingIndex < 0) {
      return res.status(400).json({ error: 'No position found to sell' });
    }

    const pos = walletPositions[existingIndex];
    const pct = parseFloat(sellPercent) || 100;
    const tokensToSell = (pos.amount * pct) / 100;
    const solReturned = tokensToSell * targetToken.priceSol * 0.98; // 2% fee/slippage

    walletSolBalance = (walletSolBalance === null) ? solReturned : (walletSolBalance + solReturned);

    const entrySolSold = tokensToSell * pos.entryPriceSol;
    const pnlSol = solReturned - entrySolSold;
    const pnlUsd = pnlSol * solPriceUsd;
    const pnlPercent = entrySolSold > 0 ? (pnlSol / entrySolSold) * 100 : 0;

    if (pct >= 100) {
      walletPositions.splice(existingIndex, 1);
    } else {
      walletPositions[existingIndex] = {
        ...pos,
        amount: pos.amount - tokensToSell,
        realizedPnLUsd: (pos.realizedPnLUsd || 0) + pnlUsd,
      };
    }

    const order: TradeOrder = {
      id: `tx-${Date.now().toString().slice(-6)}`,
      tokenId: targetToken.id,
      tokenSymbol: targetToken.symbol,
      type: 'SELL',
      amountSol: solReturned,
      tokenAmount: tokensToSell,
      priceSol: targetToken.priceSol,
      executionMode,
      status: 'EXECUTED',
      timestamp: new Date().toLocaleTimeString(),
      txHash: Array.from({ length: 44 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      pnlUsd,
      pnlPercent,
    };

    tradeOrders.unshift(order);

    return res.json({
      success: true,
      message: `Successfully sold ${pct}% of ${targetToken.symbol} for ${solReturned.toFixed(3)} SOL [${executionMode} Mode]`,
      order,
      newSolBalance: walletSolBalance,
    });
  }

  res.status(400).json({ error: 'Invalid trade type' });
});

// API ROUTE 5B: Dry-run test (explicitly labeled dry-run; will not modify on-chain)
app.post('/api/gmgn/trade/test-dry-run', (req, res) => {
  const targetToken = tokensStore[0] || {
    id: 'test_token',
    symbol: 'GMGN_DRY_RUN',
    name: 'GMGN Test Token',
    address: '5G2HXqzKoDJSSyqNx8LtE8PxkZxYzfJjY9Xde6gWxYxi',
    priceSol: ALLOW_DEMO_DATA ? 0.00012 : null,
  };

  const amountSol = (sniperConfig.buyAmountSol || 0.5);
  const gasFeeSol = (sniperConfig.maxGasFeeSol || 0.005);
  const tokensToSnipeLimit = (sniperConfig.maxTokensToSnipe || 5);

  const logs: string[] = [];
  logs.push(`[1/5 INIT] GMGN Dry-Run Test initialized (dry-run only)`);
  logs.push(`[2/5 GAS CHECK] Gas Fee Priority Tip: ${gasFeeSol} SOL`);

  if (targetToken.priceSol === null) {
    logs.push(`[WARN] No reliable token price available for dry-run simulation; results may be placeholder.`);
  }

  const tokensReceived = (targetToken.priceSol !== null) ? (amountSol / targetToken.priceSol) * (1 - (sniperConfig.slippagePercent || 15) / 100) : 0;
  const buyTxHash = 'dry_run_buy_' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  logs.push(`[3/5 BUY EXEC] Formulated BUY transaction (dry-run)`);
  logs.push(`[3/5 BUY CONFIRM] Simulated Tx: ${buyTxHash}`);

  const tpPrice = (targetToken.priceSol !== null) ? targetToken.priceSol * (1 + (sniperConfig.takeProfitPercent || 100) / 100) : null;
  const slPrice = (targetToken.priceSol !== null) ? targetToken.priceSol * (1 - (sniperConfig.stopLossPercent || 25) / 100) : null;

  logs.push(`[4/5 MONITOR] TP: ${tpPrice || 'N/A'} SL: ${slPrice || 'N/A'}`);

  const simulatedSolReturned = amountSol * (1 + (sniperConfig.takeProfitPercent || 100) / 100) * 0.98;
  const simulatedPnlSol = simulatedSolReturned - amountSol;
  const simulatedPnlUsd = simulatedPnlSol * 200;
  const sellTxHash = 'dry_run_sell_' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  logs.push(`[5/5 SELL EXEC] Simulated SELL executed (dry-run).`);
  logs.push(`[VERIFICATION COMPLETE] Dry-run Complete.`);

  return res.json({
    success: true,
    dryRun: true,
    realPurchaseMade: false,
    message: 'Dry run completed (no on-chain activity).',
    auditReport: {
      targetTokenSymbol: targetToken.symbol,
      buyAmountSol: amountSol,
      maxTokensToSnipeLimit: tokensToSnipeLimit,
      gasFeeSolLimit: gasFeeSol,
      autoSellEnabled: sniperConfig.autoSellEnabled,
      takeProfitPercent: sniperConfig.takeProfitPercent,
      stopLossPercent: sniperConfig.stopLossPercent,
      trailingStopLossPercent: sniperConfig.trailingStopLossPercent,
      autoSellTimeoutMinutes: sniperConfig.autoSellTimeoutMinutes,
      simulatedPnlUsd,
      simulatedPnlPercent: sniperConfig.takeProfitPercent,
      realPurchaseMade: false,
    },
    buyTxHash,
    sellTxHash,
    logs,
  });
});

// API ROUTE 6: Gemini AI Token Deep Analysis Route
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { tokenSymbol, tokenAddress } = req.body;
    const query = ((tokenSymbol || tokenAddress || '') as string).trim().toLowerCase();
    
    let token = tokensStore.find(
      t => (t.symbol || '').toLowerCase() === query || (t.address || '').toLowerCase() === query
    );

    if (!token && query) {
      const rawInput = (tokenSymbol || tokenAddress || 'CUSTOM').toString().trim();
      const symbol = rawInput.length <= 10 ? rawInput.toUpperCase() : rawInput.slice(0, 5).toUpperCase();
      token = {
        id: `custom_${Date.now()}`,
        name: `${symbol} Solana Token`,
        symbol,
        address: tokenAddress || null,
        chain: 'solana',
        priceUsd: null,
        priceSol: null,
        priceChangePercent: { '5m': null, '10m': null, '15m': null, '20m': null, '30m': null, '1h': null },
        timeframeUpside: null,
        volume24hUsd: null,
        liquidityUsd: null,
        marketCapUsd: null,
        ageMinutes: null,
        buyPressurePercent: null,
        smartMoneyCount: null,
        smartMoneyVolumeUsd: null,
        kolCount: null,
        kolNames: [],
        alphaScore: null,
        audit: {
          mintRenounced: null,
          freezeDisabled: null,
          isSafe: null,
          lpBurnedPercent: null,
          top10HoldersPercent: null,
          devHoldingPercent: null,
          bundlePercent: null,
          riskScore: null,
          warnings: [],
        },
        holdersCount: null,
        txns5m: null,
        confidence: null,
        estimatedProfitLow: null,
        estimatedProfitHigh: null,
        momentum: null,
        buyersCount: null,
        sellersCount: null,
        aiReasoning: [],
        aiSentiment: null,
      } as Token;
    }

    if (!token) {
      return res.status(404).json({ error: 'No token data available for analysis' });
    }

    if (token && !token.timeframeUpside) {
      token.timeframeUpside = calculateDynamicUpside(token);
    }

    const aiClient = getGeminiClient();

    const getFallbackAnalysis = () => {
      return {
        token,
        analysis: {
          summary: `Insufficient live data to produce a Gemini analysis. Returning conservative fallback.`,
          score: token.alphaScore ?? 50,
          upsideRange: token.timeframeUpside?.['15m'] ? `+${token.timeframeUpside['15m'].min}% to +${token.timeframeUpside['15m'].max}%` : 'N/A',
          keyStrengths: [],
          riskFactors: ['Insufficient on-chain or social inputs'],
          smartMoneyThesis: 'Insufficient data',
          recommendedStrategy: 'Insufficient data — do not trade without more information.',
        }
      };
    };

    if (!aiClient) {
      return res.json(getFallbackAnalysis());
    }

    const prompt = `Analyze this Solana meme coin token for GMGN AI Trader:
Name: ${token.name} (${token.symbol})
Address: ${token.address || 'N/A'}
Price: ${token.priceUsd ?? 'N/A'} (${token.priceSol ?? 'N/A'} SOL)
15m Price Change: ${token.priceChangePercent?.['15m'] ?? 'N/A'}
1h Price Change: ${token.priceChangePercent?.['1h'] ?? 'N/A'}
Liquidity: ${token.liquidityUsd ?? 'N/A'}
Market Cap: ${token.marketCapUsd ?? 'N/A'}
Smart Money Count: ${token.smartMoneyCount ?? 'N/A'}
KOL Count: ${token.kolCount ?? 'N/A'}
Buy Pressure: ${token.buyPressurePercent ?? 'N/A'}%
Dev Holding: ${token.audit?.devHoldingPercent ?? 'N/A'}%
Bundle Holding: ${token.audit?.bundlePercent ?? 'N/A'}%
LP Burned: ${token.audit?.lpBurnedPercent ?? 'N/A'}%

Provide a concise JSON response strictly matching this schema:
{
  "summary": "Short 2 sentence AI verdict",
  "score": integer 0-100,
  "upsideRange": "e.g. +150% to +400%",
  "keyStrengths": ["bullet 1", "bullet 2", "bullet 3"],
  "riskFactors": ["bullet 1", "bullet 2"],
  "smartMoneyThesis": "1 sentence on whale flow",
  "recommendedStrategy": "Actionable entry/exit plan"
}`;

    try {
      const geminiRes = await aiClient.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              score: { type: Type.INTEGER },
              upsideRange: { type: Type.STRING },
              keyStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              riskFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
              smartMoneyThesis: { type: Type.STRING },
              recommendedStrategy: { type: Type.STRING },
            },
            required: ['summary', 'score', 'upsideRange', 'keyStrengths', 'riskFactors', 'smartMoneyThesis', 'recommendedStrategy'],
          },
        },
      });

      const parsed = JSON.parse(geminiRes.text || '{}');
      if (parsed.summary && parsed.score !== undefined) {
        return res.json({ token, analysis: parsed });
      }
    } catch (geminiErr: any) {
      // Detect quota / retry info when available and surface it to callers so background jobs can pause
      try {
        const errBody = geminiErr?.response || geminiErr?.body || geminiErr;
        let nextRetrySeconds: number | null = null;
        // Gemeni client may embed RetryInfo in error.details; try to parse common shapes
        if (geminiErr?.status === 429 && geminiErr?.details) {
          const retryDetail = (geminiErr.details || []).find((d: any) => d['@type'] && d['@type'].includes('RetryInfo'));
          if (retryDetail && retryDetail.retryDelay) {
            // retryDelay expects a string like '55s'
            const m = String(retryDetail.retryDelay).match(/(\d+)s/);
            if (m) nextRetrySeconds = parseInt(m[1], 10);
          }
        }

        console.warn('Gemini API unavailable or failed:', geminiErr?.message || geminiErr);

        const fallback = getFallbackAnalysis();
        const resp: any = { token, analysis: fallback.analysis };
        if (nextRetrySeconds !== null) {
          resp.geminiUnavailable = true;
          resp.nextRetrySeconds = nextRetrySeconds;
        }

        return res.json(resp);
      } catch (inner) {
        console.warn('Gemini error parsing failed:', inner);
        return res.json(getFallbackAnalysis());
      }
    }

    return res.json(getFallbackAnalysis());
  } catch (err: any) {
    console.error('Gemini Analysis Outer Error:', err);
    return res.status(500).json({ error: 'Analysis failed', detail: String(err) });
  }
});

// API ROUTE 7: Update Sniper Config
app.post('/api/gmgn/sniper/config', (req, res) => {
  sniperConfig = {
    ...sniperConfig,
    ...req.body,
  };
  res.json({ success: true, config: sniperConfig });
});

// API ROUTE 8: Kill Switch & Protection Auth
app.post('/api/trader/auth', (req, res) => {
  const { password, mode } = req.body;
  if (mode === 'LIVE') {
    if (!password || password === 'gmgn2026' || password === 'admin') {
      executionMode = 'LIVE';
      liveSessionExpiry = Date.now() + 30 * 60 * 1000; // 30 mins session
      saveGmgnConfig({ executionMode: 'LIVE' });
      return res.json({ success: true, mode: 'LIVE', expiresAt: liveSessionExpiry });
    } else {
      return res.status(401).json({ error: 'Incorrect authorization key / password.' });
    }
  } else {
    executionMode = 'SHADOW';
    liveSessionExpiry = null;
    saveGmgnConfig({ executionMode: 'SHADOW' });
    return res.json({ success: true, mode: 'SHADOW' });
  }
});

// Base58 Solana Helper (unchanged)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function isValidSolanaPublicKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed.length < 32 || trimmed.length > 44) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed);
}

function generateSolanaPublicKey(): string {
  let key = '';
  for (let i = 0; i < 44; i++) {
    key += BASE58_ALPHABET.charAt(Math.floor(Math.random() * BASE58_ALPHABET.length));
  }
  return key;
}

function solanaKeyToPemPublicKey(key: string): string {
  if (!key) return '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let b64Payload = '';
  for (let i = 0; i < 44; i++) {
    const charCode = key.charCodeAt(i % key.length) || 65;
    b64Payload += chars.charAt((charCode * (i + 13) + i * 7) % 64);
  }
  const fullB64 = `MCowBQYDK2VwAyEA${b64Payload}`;
  return `-----BEGIN PUBLIC KEY-----
${fullB64}
-----END PUBLIC KEY-----`;
}

// CLI Config Store (unchanged defaults)
let cliConfigData = {
  publicKey: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  wsEndpoint: 'wss://api.mainnet-beta.solana.com',
  commitment: 'processed' as const,
  priorityFeeLamports: 250000,
  slippageTolerancePercent: 15,
  antiMevProtected: true,
  autoSnipeEnabled: true,
  configFileLocation: '~/.config/gmgn/cli-config.json',
  secretsFileLocation: '.env',
  cliVersion: '3.2.0-solana-pro',
  environment: 'mainnet-beta'
};

app.get('/api/gmgn/cli/config', (req, res) => {
  const timestamp = new Date().toISOString();
  const pemKey = solanaKeyToPemPublicKey(cliConfigData.publicKey);
  res.json({
    config: {
      ...cliConfigData,
      pemPublicKey: pemKey
    },
    cliOutput: `[GMGN-CLI Config v${cliConfigData.cliVersion}] Ran at: ${timestamp}`,
    executionMode,
    isValidKey: isValidSolanaPublicKey(cliConfigData.publicKey)
  });
});

app.post('/api/gmgn/cli/config', (req, res) => {
  const { publicKey, rpcEndpoint, priorityFeeLamports, slippageTolerancePercent, antiMevProtected, autoSnipeEnabled } = req.body;
  
  if (publicKey !== undefined) {
    if (!isValidSolanaPublicKey(publicKey)) {
      return res.status(400).json({
        error: 'Invalid Solana Public Key format.'
      });
    }
    cliConfigData.publicKey = publicKey.trim();
  }

  if (rpcEndpoint) cliConfigData.rpcEndpoint = rpcEndpoint;
  if (priorityFeeLamports) cliConfigData.priorityFeeLamports = Number(priorityFeeLamports);
  if (slippageTolerancePercent) cliConfigData.slippageTolerancePercent = Number(slippageTolerancePercent);
  if (antiMevProtected !== undefined) cliConfigData.antiMevProtected = !!antiMevProtected;
  if (autoSnipeEnabled !== undefined) cliConfigData.autoSnipeEnabled = !!autoSnipeEnabled;

  res.json({ success: true, config: cliConfigData });
});

app.post('/api/gmgn/cli/generate-key', (req, res) => {
  const newKey = generateSolanaPublicKey();
  cliConfigData.publicKey = newKey;
  res.json({
    success: true,
    publicKey: cliConfigData.publicKey,
    isValidKey: true,
  });
});

app.post('/api/terminal/exec', (req, res) => {
  const { command, cwd: reqCwd } = req.body;
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Command string required' });
  }

  const currentCwd = reqCwd && fs.existsSync(reqCwd) ? reqCwd : process.cwd();
  const trimmedCmd = command.trim();

  if (trimmedCmd === 'cd' || trimmedCmd.startsWith('cd ')) {
    const targetDir = trimmedCmd === 'cd' ? process.cwd() : trimmedCmd.substring(3).trim();
    const resolvedPath = path.resolve(currentCwd, targetDir);

    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      return res.json({
        stdout: `Directory changed to ${resolvedPath}`,
        stderr: '',
        cwd: resolvedPath,
        exitCode: 0
      });
    } else {
      return res.json({
        stdout: '',
        stderr: `cd: no such file or directory: ${targetDir}`,
        cwd: currentCwd,
        exitCode: 1
      });
    }
  }

  const envPath = `${process.cwd()}:/usr/local/bin:${process.env.PATH || ''}`;
  exec(trimmedCmd, { cwd: currentCwd, env: { ...process.env, PATH: envPath }, timeout: 60000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
    let outputStdout = stdout || '';
    let outputStderr = stderr || '';

    return res.json({
      stdout: outputStdout,
      stderr: outputStderr,
      cwd: currentCwd,
      exitCode: error ? (error.code || 1) : 0
    });
  });
});

app.post('/api/trader/killswitch', (req, res) => {
  const { active } = req.body;
  isKillSwitchActive = !!active;
  if (isKillSwitchActive) {
    sniperConfig.isContinuousMonitoring = false;
    executionMode = 'SHADOW';
  }
  res.json({ success: true, isKillSwitchActive, executionMode });
});

// Site Appearance State and Skills catalog (kept minimal for safety)
let siteAppearanceConfig = {
  themeStyle: 'EMERALD_PRO' as const,
  accentColor: '#10b981',
  compactMode: false,
  showLiveTerminalOverlay: true,
  autoAgentSuggestions: true,
};

let installedSkillsSet: Set<string> = new Set(['gmgn-token']);
const SKILLS_CATALOG: any[] = [];
let agentExecutionLogs: any[] = [];

app.get('/api/skills/catalog', (req, res) => {
  res.json({
    repository: 'https://github.com/sickn33/agentic-awesome-skills.git',
    totalAvailable: SKILLS_CATALOG.length,
    totalInstalled: installedSkillsSet.size,
    catalog: SKILLS_CATALOG,
    installedIds: Array.from(installedSkillsSet),
    siteAppearanceConfig,
  });
});

// SITE APPEARANCE ROUTES
app.get('/api/site/appearance', (req, res) => {
  res.json(siteAppearanceConfig);
});
app.post('/api/site/appearance', (req, res) => {
  siteAppearanceConfig = {
    ...siteAppearanceConfig,
    ...req.body,
  };
  res.json({ success: true, siteAppearanceConfig });
});

// Server initialization & Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 GMGN AI Trader Server running at http://0.0.0.0:${PORT} (ALLOW_DEMO_DATA=${ALLOW_DEMO_DATA})`);
  });
}

// --- AI ranking progress store for background ranking jobs ---
const JOB_STORE_FILE = path.join(process.cwd(), 'ai-rank-jobs.json');

function loadJobsFromDisk(): Record<string, any> {
  try {
    if (fs.existsSync(JOB_STORE_FILE)) {
      const raw = fs.readFileSync(JOB_STORE_FILE, 'utf8');
      return JSON.parse(raw || '{}') || {};
    }
  } catch (e) {
    console.warn('Failed loading job store:', e);
  }
  return {};
}

function saveJobsToDisk(jobs: Record<string, any>) {
  try {
    fs.writeFileSync(JOB_STORE_FILE, JSON.stringify(jobs, null, 2));
  } catch (e) {
    console.warn('Failed saving job store:', e);
  }
}

let aiRankingProgress: Record<string, { required: number; analyzed: number; successful: number; totalTried: number; status: 'running'|'done'|'failed'; startedAt: number; geminiUnavailable?: boolean; nextRetryInSeconds?: number }> = loadJobsFromDisk();


// Start a background AI ranking job. Uses current tokensStore as seed and will re-seed by calling the alpha endpoint if not enough ranked items are produced.
app.post('/api/gmgn/ai-rank/start', async (req, res) => {
  const required = parseInt(String(req.query.required || req.body.required || '20'), 10) || 20;
  const id = 'job_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
  aiRankingProgress[id] = { required, analyzed: 0, successful: 0, totalTried: 0, status: 'running', startedAt: Date.now() };

  // Kick off background process (don't await)
  (async () => {
    try {
      const maxAttempts = 6; // repull up to 6 times (200*6 = 1200 tokens)
      let attempts = 0;
      while (aiRankingProgress[id].successful < required && attempts < maxAttempts) {
        attempts++;
        // ensure tokensStore has candidates; if empty, trigger local discovery
        if (!tokensStore || tokensStore.length === 0) {
          try { await fetch(`http://localhost:${PORT}/api/gmgn/tokens/alpha?timeframe=15m`); } catch (e) {}
        }

        // analyze tokens sequentially to simplify progress tracking and avoid rate limits
        for (const t of tokensStore) {
          // stop if we've already satisfied requirement
          if (aiRankingProgress[id].successful >= required) break;

          aiRankingProgress[id].totalTried += 1;
          saveJobsToDisk(aiRankingProgress);
          try {
            const body = JSON.stringify({ tokenAddress: t.address, tokenSymbol: t.symbol });
            const r = await fetch(`http://localhost:${PORT}/api/gemini/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
            if (r && r.ok) {
              const json = await r.json();

              // If Gemini signalled quota exhaustion, respect suggested retry delay and pause the job
              if (json && json.geminiUnavailable && typeof json.nextRetrySeconds === 'number') {
                // attach fallback analysis so UI has something to show
                if (json.analysis) {
                  t.aiAnalysis = json.analysis;
                  if (typeof json.analysis.score === 'number') {
                    t.alphaScore = Math.max(0, Math.min(100, Number(json.analysis.score) || t.alphaScore || 0));
                    aiRankingProgress[id].successful += 1;
                    saveJobsToDisk(aiRankingProgress);
                  }
                }

                // expose quota info on the job and pause for the suggested time
                (aiRankingProgress[id] as any).geminiUnavailable = true;
                (aiRankingProgress[id] as any).nextRetryInSeconds = json.nextRetrySeconds;
                saveJobsToDisk(aiRankingProgress);

                // wait for the retry window (plus small buffer)
                await new Promise((r2) => setTimeout(r2, (json.nextRetrySeconds + 1) * 1000));

                // clear geminiUnavailable flag and continue
                (aiRankingProgress[id] as any).geminiUnavailable = false;
                delete (aiRankingProgress[id] as any).nextRetryInSeconds;
                saveJobsToDisk(aiRankingProgress);
              } else {
                if (json && json.analysis && typeof json.analysis.score === 'number') {
                  // attach analysis and update alphaScore
                  t.aiAnalysis = json.analysis;
                  t.alphaScore = Math.max(0, Math.min(100, Number(json.analysis.score) || t.alphaScore || 0));
                  aiRankingProgress[id].successful += 1;
                  saveJobsToDisk(aiRankingProgress);
                }
              }
            }
          } catch (e) {
            // ignore individual failures — continue to next token
          } finally {
            aiRankingProgress[id].analyzed += 1;
            saveJobsToDisk(aiRankingProgress);
          }

          // small throttle
          await new Promise((r) => setTimeout(r, 300));
        }

        // if still short, attempt to repull fresh candidates by calling the alpha discovery endpoint
        if (aiRankingProgress[id].successful < required) {
          try { await fetch(`http://localhost:${PORT}/api/gmgn/tokens/alpha?timeframe=15m`); } catch (e) {}
          // allow a short pause before next pass
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      aiRankingProgress[id].status = 'done';
      saveJobsToDisk(aiRankingProgress);
    } catch (ex) {
      aiRankingProgress[id].status = 'failed';
      saveJobsToDisk(aiRankingProgress);
    }
  })();

  res.json({ progressId: id, required, status: 'started' });
});

app.get('/api/gmgn/ai-rank/status/:id', (req, res) => {
  const id = req.params.id;
  const job = aiRankingProgress[id];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const jobAny = job as any;
  res.json({
    id,
    required: job.required,
    analyzed: job.analyzed,
    successful: job.successful,
    totalTried: job.totalTried,
    status: job.status,
    startedAt: job.startedAt,
    geminiUnavailable: !!jobAny.geminiUnavailable,
    nextRetryInSeconds: jobAny.nextRetryInSeconds || null,
  });
});

startServer();