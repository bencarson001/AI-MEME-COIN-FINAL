export type Timeframe = '5m' | '10m' | '15m' | '20m' | '30m' | '1h';

export type AnalysisTimeframe = '5m' | '10m' | '15m' | '30m' | '60m' | '6h';

export type KlineInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export type ExecutionMode = 'SHADOW' | 'LIVE';

export interface SecurityAudit {
  mintRenounced: boolean;
  freezeDisabled: boolean;
  lpBurnedPercent: number;
  devHoldingPercent: number;
  bundlePercent: number;
  top10HoldersPercent: number;
  riskScore: number; // 0-100 (0 low risk, 100 extreme risk)
  isSafe: boolean;
  warnings: string[];
}

export type ChainType = 'solana' | 'ethereum' | 'base' | 'bsc' | 'arbitrum' | 'polygon' | 'blast';

export type RankingVerdict = 'EXTREME ALPHA' | 'VERY STRONG' | 'STRONG' | 'PROMISING' | 'WATCH' | 'HIGH RISK' | 'AVOID' | 'FILTERED';

export interface Token {
  id: string;
  name: string;
  symbol: string;
  address: string;
  chain: ChainType;
  logoUrl?: string;
  priceUsd: number;
  priceSol: number;
  priceChangePercent: Record<string, number>;
  liquidityUsd: number;
  marketCapUsd: number;
  volume24hUsd: number;
  ageMinutes: number;
  
  // Alpha & Momentum Metrics
  alphaScore: number; // 0-100 (weighted matrix sum)
  confidence: number;
  confidenceScore?: number; // Calculated separately from Alpha Score
  dataQualityScore?: number; // Data Completeness & Signal Freshness (0-100)
  verdict?: RankingVerdict;
  
  estimatedProfitLow: number;
  estimatedProfitHigh: number;
  expectedDownsidePercent?: number; // ESTIMATE (e.g. -15%)
  riskRewardRatio?: string; // ESTIMATE (e.g. "1 : 4.5")
  
  timeframeUpside: Record<string, { min: number; max: number }>; // e.g. +120% to +350%
  momentum: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW' | 'CRASHED';
  buyPressurePercent: number; // 0-100% buy ratio
  txns5m: number;
  buyersCount: number;
  sellersCount: number;
  
  // Whale & KOL tracking
  holdersCount: number;
  smartMoneyCount: number;
  smartMoneyVolumeUsd: number;
  kolCount: number;
  kolNames: string[];
  
  // Security & Risk
  audit: SecurityAudit;
  
  // Detailed AI Alpha Ranking Explanation Fields
  topBullishFactors?: string[];
  topBearishFactors?: string[];
  missingData?: string[];
  whyRankedHere?: string;
  invalidationTriggers?: string;
  betterThanLowerTokenReason?: string;
  
  // AI Insights
  aiReasoning: string[];
  aiSentiment: 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'HIGH_RISK';
  // Optional detailed AI analysis attached after Gemini/enrichment
  aiAnalysis?: AIAnalysisResult;
}

export interface AlphaSettingsConfig {
  maxMarketCapUsd: number;
  minMarketCapUsd: number;
  minLiquidityUsd: number;
  maxBundlePercent: number;
  maxDevHoldingPercent: number;
  maxTop10HoldersPercent: number;
  maxCrashPercent: number;
  maxSecurityRiskScore: number;
  minSmartMoneyVolumeUsd: number;
  minHoldersCount: number;
  maxTokenAgeMinutes: number;
  minTokenAgeMinutes: number;
  minAlphaScore: number;
}

export interface SniperConfig {
  minMarketCapUsd?: number;
  minLiquidityUsd: number;
  maxBundlePercent: number;
  maxDevHoldingPercent: number;
  minBuyPressurePercent: number;
  minSmartMoneyCount: number;
  minKolCount: number;
  minAlphaScore: number;
  
  // Snipe limits & Gas fee filters (GMGN API Standard)
  maxTokensToSnipe: number;
  maxGasFeeSol: number;

  // Trade execution & Auto Sell TP/SL filters
  buyAmountSol: number;
  autoSellEnabled: boolean;
  takeProfitPercent: number;
  stopLossPercent: number;
  trailingStopLossPercent: number;
  autoSellTimeoutMinutes: number;
  maxPositions: number;
  slippagePercent: number;
  
  // Monitoring toggle
  isContinuousMonitoring: boolean;
}

export interface WalletPosition {
  tokenId: string;
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  amount: number;
  entryPriceSol: number;
  currentPriceSol: number;
  entryValueUsd: number;
  currentValueUsd: number;
  unrealizedPnLUsd: number;
  unrealizedPnLPercent: number;
  realizedPnLUsd: number;
  executionMode: ExecutionMode;
  boughtAt: string;
}

export interface CliConfig {
  publicKey: string;
  pemPublicKey?: string;
  rpcEndpoint: string;
  wsEndpoint: string;
  commitment: 'processed' | 'confirmed' | 'finalized';
  priorityFeeLamports: number;
  slippageTolerancePercent: number;
  antiMevProtected: boolean;
  autoSnipeEnabled: boolean;
  configFileLocation: string;
  cliVersion: string;
  environment: string;
}

export interface TradeOrder {
  id: string;
  tokenId: string;
  tokenSymbol: string;
  type: 'BUY' | 'SELL';
  amountSol: number;
  tokenAmount: number;
  priceSol: number;
  executionMode: ExecutionMode;
  status: 'EXECUTED' | 'FAILED' | 'CANCELLED';
  timestamp: string;
  txHash: string;
  pnlUsd?: number;
  pnlPercent?: number;
}

export interface KlineDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  smartMoneyBuy?: boolean;
  smartMoneySell?: boolean;
  kolCall?: boolean;
  ma7?: number;
  ma25?: number;
}

export interface AIAnalysisResult {
  summary: string;
  score: number;
  confidenceScore?: number;
  dataQualityScore?: number;
  verdict?: RankingVerdict;
  upsideRange: string;
  expectedDownside?: string;
  riskRewardRatio?: string;
  keyStrengths: string[];
  riskFactors: string[];
  smartMoneyThesis: string;
  recommendedStrategy: string;
  whyRankedHere?: string;
  invalidationTriggers?: string;
  betterThanLowerTokenReason?: string;
}

export type SkillCategory = 'GMGN_TRADING' | 'ONCHAIN_ANALYSIS' | 'SITE_CUSTOMIZATION' | 'AI_AGENT' | 'SECURITY' | 'SNIPER_BOT';

export interface AiSkill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  repository: string;
  author: string;
  version: string;
  tags: string[];
  isInstalled: boolean;
  installPath: string;
  cliCommand?: string;
  agentCapabilities: string[];
  samplePrompts: string[];
  iconName: string;
}

export interface SkillMatchResult {
  matchedSkill: AiSkill;
  confidenceScore: number; // 0-100
  matchReason: string;
  wasInstalledOnDemand: boolean;
  agentPlan: string[];
  suggestedAction: {
    type: 'SITE_CHANGE' | 'TRADER_UPDATE' | 'ONCHAIN_ANALYSIS' | 'EXECUTE_SWAP' | 'LAUNCH_TOKEN' | 'SNIPER_CONFIG' | 'SECURITY';
    payload: Record<string, any>;
    summary: string;
  };
}

export interface AgentExecutionLog {
  id: string;
  timestamp: string;
  skillId: string;
  prompt: string;
  agentName: string;
  status: 'PENDING' | 'INSTALLING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  stdoutLogs: string[];
  actionsTaken: string[];
  siteChangesApplied?: Record<string, any>;
  traderUpdatesApplied?: Record<string, any>;
  resultSummary: string;
}

export type SiteThemeStyle = 'EMERALD_PRO' | 'CYBERPUNK_NEON' | 'MIDNIGHT_GOLD' | 'TERMINAL_HIGH_CONTRAST' | 'AMETHYST_DARK';

export interface SiteAppearanceConfig {
  themeStyle: SiteThemeStyle;
  accentColor: string;
  compactMode: boolean;
  showLiveTerminalOverlay: boolean;
  autoAgentSuggestions: boolean;
}

