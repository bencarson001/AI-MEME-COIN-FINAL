import { Token, Timeframe } from '../types';

export function calculateDynamicUpside(token: Partial<Token>): Record<string, { min: number; max: number }> {
  const isCrashed = token.momentum === 'CRASHED' || (token.audit?.riskScore && token.audit.riskScore > 70);
  
  if (isCrashed) {
    return {
      '5m': { min: -35, max: -5 },
      '10m': { min: -50, max: 5 },
      '15m': { min: -60, max: 10 },
      '20m': { min: -75, max: 15 },
      '30m': { min: -85, max: 20 },
      '60m': { min: -95, max: 25 },
      '1h': { min: -95, max: 25 },
      '6h': { min: -95, max: 50 },
    };
  }

  // Calculate unique multiplier based on token attributes
  const scoreMultiplier = Math.max(0.4, (token.alphaScore || 80) / 80);
  const buyPressureMult = Math.max(0.4, ((token.buyPressurePercent || 75) - 35) / 35);
  const smartMoneyBoost = 1 + (token.smartMoneyCount || 5) * 0.03;
  
  // Liquidity to Market Cap ratio impact
  const mcapRatio = token.marketCapUsd && token.liquidityUsd 
    ? Math.min(2.2, Math.max(0.6, (token.liquidityUsd * 4) / token.marketCapUsd)) 
    : 1.0;

  // Derive seed variance from token symbol/id for unique character
  const symbolSeed = (token.symbol || 'MEME').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seedVariance = 0.85 + (symbolSeed % 35) / 100; // 0.85 to 1.20

  const factor = scoreMultiplier * buyPressureMult * smartMoneyBoost * mcapRatio * seedVariance;

  const baseMins: Record<string, number> = { '5m': 15, '10m': 35, '15m': 70, '20m': 105, '30m': 150, '60m': 230, '1h': 230, '6h': 450 };
  const baseMaxs: Record<string, number> = { '5m': 55, '10m': 120, '15m': 240, '20m': 380, '30m': 540, '60m': 920, '1h': 920, '6h': 1800 };

  const result: Record<string, { min: number; max: number }> = {};
  
  (['5m', '10m', '15m', '20m', '30m', '60m', '1h', '6h'] as const).forEach((tf) => {
    const minVal = Math.round(baseMins[tf] * factor);
    const maxVal = Math.round(baseMaxs[tf] * factor * 1.25);
    result[tf] = {
      min: Math.max(5, minVal),
      max: Math.max(minVal + 20, maxVal),
    };
  });

  return result;
}
