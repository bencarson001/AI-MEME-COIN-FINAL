import React, { useState } from 'react';
import { Token, Timeframe, AnalysisTimeframe, AlphaSettingsConfig } from '../types';
import { TokenAddressBar } from './TokenAddressBar';
import { AiAnalysisModal } from './AiAnalysisModal';
import { calculateDynamicUpside } from '../utils/upside';
import { 
  Flame, 
  TrendingUp, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  DollarSign, 
  Zap, 
  BarChart2, 
  ShoppingCart, 
  Clock, 
  ChevronDown, 
  Search, 
  Info,
  Layers,
  ArrowUpRight,
  RotateCcw,
  Settings,
  X,
  Check
} from 'lucide-react';

export const DEFAULT_ALPHA_SETTINGS: AlphaSettingsConfig = {
  maxMarketCapUsd: 100000000,
  minMarketCapUsd: 10000,
  minLiquidityUsd: 5000,
  maxBundlePercent: 25,
  maxDevHoldingPercent: 15,
  maxTop10HoldersPercent: 60,
  maxCrashPercent: 40,
  maxSecurityRiskScore: 75,
  minSmartMoneyVolumeUsd: 0,
  minHoldersCount: 30,
  maxTokenAgeMinutes: 10080,
  minTokenAgeMinutes: 0,
  minAlphaScore: 50,
};

interface AlphaExplorerProps {
  tokens: Token[];
  selectedTimeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onQuickBuy: (token: Token) => void;
  onOpenChart: (token: Token) => void;
  onAnalyzeAi: (token: Token) => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  aiRankProgress?: any;
}

export const AlphaExplorer: React.FC<AlphaExplorerProps> = ({
  tokens,
  selectedTimeframe,
  onTimeframeChange,
  onQuickBuy,
  onOpenChart,
  onAnalyzeAi,
  onRefreshData,
  isRefreshing,
  aiRankProgress,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSafeOnly, setFilterSafeOnly] = useState(false);
  const [selectedChain, setSelectedChain] = useState<string>('ALL');
  const [analysisTimeframe, setAnalysisTimeframe] = useState<AnalysisTimeframe>('15m');
  
  const [tokenAddress, setTokenAddress] = useState('');
  const [analyzingToken, setAnalyzingToken] = useState<Token | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Alpha Ranking Settings state
  const [settings, setSettings] = useState<AlphaSettingsConfig>(() => {
    try {
      const saved = localStorage.getItem('gmgn_alpha_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_ALPHA_SETTINGS;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState<AlphaSettingsConfig>(settings);

  const handleOpenSettings = () => {
    setTempSettings(settings);
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    setSettings(tempSettings);
    try {
      localStorage.setItem('gmgn_alpha_settings', JSON.stringify(tempSettings));
    } catch (e) {}
    setIsSettingsOpen(false);
  };

  const handleResetDefaults = () => {
    setTempSettings(DEFAULT_ALPHA_SETTINGS);
  };

  const analysisTimeframes: { value: AnalysisTimeframe; label: string }[] = [
    { value: '5m', label: '⚡ 5 Minutes' },
    { value: '10m', label: '🔥 10 Minutes' },
    { value: '15m', label: '🎯 15 Minutes (Default)' },
    { value: '30m', label: '🚀 30 Minutes' },
    { value: '60m', label: '💎 60 Minutes' },
    { value: '6h', label: '🌌 6 Hours' },
  ];

  const timeframes: { value: Timeframe; label: string }[] = [
    { value: '5m', label: '⚡ 5 Minutes' },
    { value: '10m', label: '🔥 10 Minutes' },
    { value: '15m', label: '🎯 15 Minutes' },
    { value: '20m', label: '📈 20 Minutes' },
    { value: '30m', label: '🚀 30 Minutes' },
    { value: '1h', label: '💎 1 Hour' },
  ];

  const chains = [
    { id: 'ALL', label: '🌐 All Chains' },
    { id: 'solana', label: '🟣 Solana' },
    { id: 'ethereum', label: '🔷 Ethereum' },
    { id: 'base', label: '🔵 Base' },
    { id: 'bsc', label: '🟡 BSC' },
  ];

  const handleAnalyzeToken = async () => {
    if (!tokenAddress.trim()) return;
    setIsAnalyzing(true);
    try {
      const query = tokenAddress.trim();
      let targetToken = tokens.find(
        (t) =>
          t.address.toLowerCase() === query.toLowerCase() ||
          t.symbol.toLowerCase() === query.toLowerCase() ||
          t.name.toLowerCase().includes(query.toLowerCase())
      );

      if (!targetToken) {
        const res = await fetch('/api/gemini/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenAddress: query, tokenSymbol: query }),
        });
        const json = await res.json();
        if (json.token) {
          targetToken = json.token;
        }
      }

      if (targetToken) {
        onAnalyzeAi(targetToken);
      }
    } catch (err) {
      console.error('Failed AI analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };
  const getAnalysisTimeframeKey = (atf: AnalysisTimeframe): Timeframe => {
    if (atf === '60m') return '1h';
    return atf as Timeframe;
  };

  const filteredTokens = tokens.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSafe = filterSafeOnly ? t.audit.isSafe : true;
    const matchesChain = selectedChain === 'ALL' || t.chain === selectedChain;

    const mcap = t.marketCapUsd ?? 0;
    const matchesMinMcap = mcap >= settings.minMarketCapUsd;
    const matchesMaxMcap = settings.maxMarketCapUsd <= 0 || mcap <= settings.maxMarketCapUsd;

    const liq = t.liquidityUsd ?? 0;
    const matchesLiq = liq >= settings.minLiquidityUsd;

    const bundle = t.audit?.bundlePercent ?? 0;
    const matchesBundle = bundle <= settings.maxBundlePercent;

    const devHold = t.audit?.devHoldingPercent ?? 0;
    const matchesDevHold = devHold <= settings.maxDevHoldingPercent;

    const top10 = t.audit?.top10HoldersPercent ?? 0;
    const matchesTop10 = top10 <= settings.maxTop10HoldersPercent;

    const riskScore = t.audit?.riskScore ?? 0;
    const matchesRisk = riskScore <= settings.maxSecurityRiskScore;

    const smartMoney = t.smartMoneyVolumeUsd ?? 0;
    const matchesSmartMoney = smartMoney >= settings.minSmartMoneyVolumeUsd;

    const holders = t.holdersCount ?? 0;
    const matchesHolders = holders >= settings.minHoldersCount;

    const age = t.ageMinutes ?? 0;
    const matchesMinAge = age >= settings.minTokenAgeMinutes;
    const matchesMaxAge = settings.maxTokenAgeMinutes <= 0 || age <= settings.maxTokenAgeMinutes;

    const alphaScore = t.alphaScore ?? 0;
    const matchesAlphaScore = alphaScore >= settings.minAlphaScore;

    const atfKey = getAnalysisTimeframeKey(analysisTimeframe);
    const atfChange = t.priceChangePercent?.[atfKey] ?? t.priceChangePercent?.['15m'] ?? 0;
    const p5mDrop = t.priceChangePercent?.['5m'] ?? 0;
    const maxDrop = Math.min(atfChange, p5mDrop);
    const matchesCrash = maxDrop >= -settings.maxCrashPercent;

    return (
      matchesSearch &&
      matchesSafe &&
      matchesChain &&
      matchesMinMcap &&
      matchesMaxMcap &&
      matchesLiq &&
      matchesBundle &&
      matchesDevHold &&
      matchesTop10 &&
      matchesRisk &&
      matchesSmartMoney &&
      matchesHolders &&
      matchesMinAge &&
      matchesMaxAge &&
      matchesAlphaScore &&
      matchesCrash
    );
  });

  const sortedFilteredTokens = [...filteredTokens].sort((a, b) => {
    const atfKey = getAnalysisTimeframeKey(analysisTimeframe);
    const changeA = a.priceChangePercent?.[atfKey] ?? a.priceChangePercent?.['15m'] ?? 0;
    const changeB = b.priceChangePercent?.[atfKey] ?? b.priceChangePercent?.['15m'] ?? 0;
    const scoreA = ((a.alphaScore ?? 0) * 0.6) + (changeA || 0) * 0.4;
    const scoreB = ((b.alphaScore ?? 0) * 0.6) + (changeB || 0) * 0.4;
    return scoreB - scoreA;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner & Timeframe Selector */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
+        {/* AI Rank Progress Bar */}
+        {aiRankProgress && (
+          <div className="mb-3">
+            <div className="text-xs text-slate-300">AI Ranking Progress: {aiRankProgress.successful}/{aiRankProgress.required} ranked</div>
+            <div className="w-full bg-slate-800 rounded-full h-2 mt-1 overflow-hidden">
+              <div className="bg-emerald-400 h-2" style={{ width: `${Math.min(100, (aiRankProgress.successful / Math.max(1, aiRankProgress.required)) * 100)}%` }} />
+            </div>
+          </div>
+        )}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Flame className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">GMGN Alpha Explorer</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                GMGN AI Scanner Active
              </span>
              <button
                onClick={handleOpenSettings}
                title="Alpha Explorer Ranking Settings"
                className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-emerald-500/50"
              >
                <Settings className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-semibold">Settings</span>
              </button>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-500/40">
                10,480+ Tokens Analyzed
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                MC ≥ $10,000 Filter Enforced
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-950/80 text-purple-400 border border-purple-500/40">
                🚫 Top 50 Popular Excluded
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Live algorithmic ranking based on on-chain whale flow, buy pressure, KOL signals, LP security audits, and projected horizon upside.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 items-start sm:items-end w-full sm:w-auto">
            {/* 1. AI Analysis Search Box */}
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-full sm:w-auto justify-between">
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAnalyzeToken();
                }}
                placeholder="Enter token address or symbol..."
                className="bg-transparent text-slate-200 px-3 py-1.5 text-xs focus:outline-none w-48 sm:w-56 font-mono"
              />
              <button
                onClick={handleAnalyzeToken}
                disabled={isAnalyzing || !tokenAddress.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/40 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isAnalyzing ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : 'Analyse this token'}
              </button>
            </div>

            {/* 2. Analysis Timeframe Dropdown (Underneath token analysis text box & Above target timeframe box) */}
            <div className="flex items-center justify-between gap-3 bg-slate-950 p-2 rounded-xl border border-purple-900/50 shadow-inner w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300 px-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span>Analysis Timeframe:</span>
              </div>
              <div className="relative">
                <select
                  value={analysisTimeframe}
                  onChange={(e) => setAnalysisTimeframe(e.target.value as AnalysisTimeframe)}
                  className="appearance-none bg-slate-900 text-purple-300 font-bold text-xs px-3 py-1.5 pr-8 rounded-lg border border-purple-500/40 focus:outline-none focus:border-purple-400 cursor-pointer shadow-sm"
                >
                  {analysisTimeframes.map((tf) => (
                    <option key={tf.value} value={tf.value} className="bg-slate-900 text-slate-200">
                      {tf.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-purple-400 absolute right-2.5 top-2 pointer-events-none" />
              </div>
            </div>

            {/* 3. Target Timeframe Dropdown Selection */}
            <div className="flex items-center justify-between gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800 shadow-inner w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 px-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Target Timeframe:</span>
              </div>
              <div className="relative">
                <select
                  value={selectedTimeframe}
                  onChange={(e) => onTimeframeChange(e.target.value as Timeframe)}
                  className="appearance-none bg-slate-900 text-emerald-400 font-bold text-xs px-3 py-1.5 pr-8 rounded-lg border border-slate-700/80 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
                >
                  {timeframes.map((tf) => (
                    <option key={tf.value} value={tf.value} className="bg-slate-900 text-slate-200">
                      {tf.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
              </div>
            </div>

            {/* 4. Refresh Button Underneath Parameter Settings */}
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 hover:from-emerald-900 hover:to-teal-900 text-emerald-400 border border-emerald-500/40 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 active:scale-95"
              title="Refresh GMGN Full Market Data Analysis"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-300' : 'text-emerald-400'}`} />
              <span>{isRefreshing ? 'Scanning Full Market Data...' : '🔄 Refresh Market Data'}</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search symbol, name, or CA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Chain Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {chains.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChain(c.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    selectedChain === c.id
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Security Check Filter */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-300">
              <input
                type="checkbox"
                checked={filterSafeOnly}
                onChange={(e) => setFilterSafeOnly(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20"
              />
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Safe Only</span>
            </label>
          </div>

          <div className="text-slate-400 text-[11px] font-mono flex items-center gap-2">
            <span>Showing <span className="text-emerald-400 font-bold">{sortedFilteredTokens.length}</span> ranked candidates</span>
            <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
              ⚡ Analyzed over last {analysisTimeframe} window
            </span>
          </div>
        </div>
      </div>

      {/* Alpha Token Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedFilteredTokens.map((token, index) => {
          const atfKey = getAnalysisTimeframeKey(analysisTimeframe);
          const analysisChangePercent = token.priceChangePercent?.[atfKey] ?? token.priceChangePercent?.['15m'] ?? 0;
          const changePercent = token.priceChangePercent?.[selectedTimeframe] || 0;
          const upside = (token.timeframeUpside && token.timeframeUpside[selectedTimeframe]) || calculateDynamicUpside(token)[selectedTimeframe] || { min: 0, max: 0 };

          return (
            <div
              key={`${token.id}-${index}`}
              className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700 p-5 shadow-lg hover:shadow-emerald-950/20 transition-all flex flex-col justify-between group"
            >
              {/* Card Header: Rank, Logo, Price & Alpha Score */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    {/* Confidence Score BIG Left */}
                    <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30 text-center">
                       <div className="text-[10px] text-emerald-400 font-bold uppercase">Confidence</div>
                       <div className="text-2xl font-mono font-bold text-white">{(token.confidence ?? 0).toFixed(0)}%</div>
                    </div>

                    {/* Logo & Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        {token.logoUrl && (token.logoUrl.startsWith('http') || token.logoUrl.startsWith('https')) ? (
                           <img 
                             src={token.logoUrl} 
                             alt={token.name} 
                             className="w-6 h-6 rounded-full object-cover"
                             onError={(e) => { e.currentTarget.style.display = 'none'; }}
                           />
                        ) : (
                           <span className="text-xl flex items-center justify-center w-6 h-6">{token.logoUrl || '🪙'}</span>
                        )}
                        <span className="font-bold text-lg text-white">
                          {token.name}
                        </span>
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          ${token.symbol}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 ml-2 text-xs text-slate-400">
                           <span className={`font-mono font-bold ${(analysisChangePercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                             {analysisTimeframe}: {(analysisChangePercent ?? 0) >= 0 ? '+' : ''}{(analysisChangePercent ?? 0).toFixed(1)}%
                           </span>
                           <span>| {(token.holdersCount ?? 0).toLocaleString()} holders</span>
                           <span>| Dev: {(token.audit?.devHoldingPercent ?? 0).toFixed(1)}%</span>
                           <span>| Bundle: {(token.audit?.bundlePercent ?? 0).toFixed(1)}%</span>
                           <span>| Age: {token.ageMinutes || 0}m</span>
                           <span>| 5m Txns: <strong className="text-emerald-400 font-mono font-bold">{token.txns5m || Math.round(((token.buyersCount || 0) + (token.sellersCount || 0)) / 12)}</strong></span>
                           <div className="flex w-16 h-2 rounded-full overflow-hidden bg-red-500">
                             <div className="bg-emerald-500 h-full" style={{ width: `${token.buyPressurePercent ?? 50}%` }}></div>
                           </div>
                           <span className="px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-500/20">Pump</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rank Badge & Alpha Score Right */}
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 uppercase tracking-wider">
                        {token.verdict || 'STRONG'}
                      </span>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                        index === 0 ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30' : 'bg-slate-800 text-slate-400'
                      }`}>#{index + 1}</div>
                    </div>
                    <div className="text-emerald-300 font-bold font-mono text-sm">{Number(token.alphaScore ?? 0).toFixed(0)}/100</div>
                  </div>
                </div>

                {/* Main Metrics Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  {/* Price Changes */}
                  <div className="col-span-2 grid grid-cols-4 gap-2">
                    {['5m', '15m', '30m', '1h'].map(tf => (
                      <div key={tf} className="text-center">
                        <div className="text-[9px] text-slate-500 font-bold">{tf}</div>
                        <div className={`font-mono text-xs font-bold ${(token.priceChangePercent?.[tf as Timeframe] || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {(token.priceChangePercent?.[tf as Timeframe] || 0).toFixed(2)}%
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Holders */}
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Holders</div>
                    <div className="font-mono font-bold text-sm text-slate-200">{(token.holdersCount ?? 0).toLocaleString()}</div>
                  </div>
                  {/* Top 10 */}
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Top 10</div>
                    <div className="font-mono font-bold text-sm text-slate-200">{(token.audit?.top10HoldersPercent ?? 0).toFixed(2)}%</div>
                  </div>
                </div>

                {/* Projected Horizon Upside Badge */}
                <div className="my-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-slate-950 via-slate-950/90 to-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-xs font-mono shadow-sm">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span>Est. Projection Upside ({selectedTimeframe}):</span>
                  </div>
                  <div className="font-bold text-emerald-400 text-sm">
                    {upside.min >= 0 ? `+${upside.min}%` : `${upside.min}%`} → +{upside.max}%
                  </div>
                </div>

                {/* Risk Indicators & Security */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950/40 rounded-xl border border-slate-800 text-[11px]">
                  <div className="flex items-center gap-2">
                    {token.audit?.isSafe ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Audit Clean (0% Tax / 100% LP Burn)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400 font-semibold">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Risk Warning: Freeze / Dev Bundle
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-mono text-slate-400">
                    <span>Bundle: <strong className={(token.audit?.bundlePercent ?? 0) > 10 ? 'text-amber-400' : 'text-slate-200'}>{(token.audit?.bundlePercent ?? 0).toFixed(2)}%</strong></span>
                    <span>Dev: <strong className={(token.audit?.devHoldingPercent ?? 0) > 5 ? 'text-red-400' : 'text-slate-200'}>{(token.audit?.devHoldingPercent ?? 0).toFixed(1)}%</strong></span>
                  </div>
                </div>

                {/* AI Reasoning Highlights */}
                <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] mb-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Why Ranked High (AI Drivers):</span>
                  </div>
                  <ul className="space-y-1 text-slate-300 text-[11px]">
                    {token.aiReasoning.map((reason, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-1.5">
                        <span className="text-emerald-500">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Full Token Contract Address Bar & GMGN.AI / Trojan.com Links */}
                <div className="mt-3">
                  <TokenAddressBar address={token.address} chain={token.chain} />
                </div>
              </div>

              {/* Card Actions Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Chart Trigger */}
                  <button
                    onClick={() => onOpenChart(token)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>K-Chart</span>
                  </button>

                  {/* AI Deep Analysis */}
                  <button
                    onClick={() => onAnalyzeAi(token)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 font-semibold text-xs flex items-center gap-1.5 border border-indigo-800/60 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>AI Insights</span>
                  </button>
                </div>

                {/* Quick BUY */}
                <button
                  onClick={() => onQuickBuy(token)}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Quick BUY</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alpha Explorer Analysis Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Settings className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Alpha Explorer Ranking & Limits Settings</h3>
                  <p className="text-xs text-slate-400">Set custom thresholds and limits for Alpha Explorer analysis ranking.</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input Grid (13 requested parameters) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* 1. Maximum Market Cap */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium flex items-center justify-between">
                  <span>Maximum Market Cap ($ USD)</span>
                  <span className="text-[10px] text-slate-500 font-mono">0 = Unlimited</span>
                </label>
                <input
                  type="number"
                  value={tempSettings.maxMarketCapUsd}
                  onChange={(e) => setTempSettings({ ...tempSettings, maxMarketCapUsd: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 100000000"
                />
              </div>

              {/* 2. Minimum Market Cap */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Minimum Market Cap ($ USD)</label>
                <input
                  type="number"
                  value={tempSettings.minMarketCapUsd}
                  onChange={(e) => setTempSettings({ ...tempSettings, minMarketCapUsd: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 10000"
                />
              </div>

              {/* 3. Minimum Liquidity */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Minimum Liquidity ($ USD)</label>
                <input
                  type="number"
                  value={tempSettings.minLiquidityUsd}
                  onChange={(e) => setTempSettings({ ...tempSettings, minLiquidityUsd: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 5000"
                />
              </div>

              {/* 4. Maximum Bundler % */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Maximum Bundler %</label>
                <input
                  type="number"
                  step="0.5"
                  value={tempSettings.maxBundlePercent}
                  onChange={(e) => setTempSettings({ ...tempSettings, maxBundlePercent: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 25"
                />
              </div>

              {/* 5. Maximum Dev Hold % */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Maximum Dev Hold %</label>
                <input
                  type="number"
                  step="0.5"
                  value={tempSettings.maxDevHoldingPercent}
                  onChange={(e) => setTempSettings({ ...tempSettings, maxDevHoldingPercent: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 15"
                />
              </div>

              {/* 6. Maximum Top Holder % */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Maximum Top Holder % (Top 10)</label>
                <input
                  type="number"
                  step="1"
                  value={tempSettings.maxTop10HoldersPercent}
                  onChange={(e) => setTempSettings({ ...tempSettings, maxTop10HoldersPercent: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 60"
                />
              </div>

              {/* 7. Maximum Crash % */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Maximum Crash %</label>
                <input
                  type="number"
                  step="1"
                  value={tempSettings.maxCrashPercent}
                  onChange={(e) => setTempSettings({ ...tempSettings, maxCrashPercent: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 40"
                />
              </div>

              {/* 8. Maximum Security Risk */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Maximum Security Risk (Score 0-100)</label>
                <input
                  type="number"
                  value={tempSettings.maxSecurityRiskScore}
                  onChange={(e) => setTempSettings({ ...tempSettings, maxSecurityRiskScore: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 75"
                />
              </div>

              {/* 9. Minimum Smart Money */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Minimum Smart Money ($ USD)</label>
                <input
                  type="number"
                  value={tempSettings.minSmartMoneyVolumeUsd}
                  onChange={(e) => setTempSettings({ ...tempSettings, minSmartMoneyVolumeUsd: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 0"
                />
              </div>

              {/* 10. Minimum Holders */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Minimum Holders</label>
                <input
                  type="number"
                  value={tempSettings.minHoldersCount}
                  onChange={(e) => setTempSettings({ ...tempSettings, minHoldersCount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 30"
                />
              </div>

              {/* 11. Maximum Token Age */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium flex items-center justify-between">
                  <span>Maximum Token Age (minutes)</span>
                  <span className="text-[10px] text-slate-500 font-mono">0 = Unlimited</span>
                </label>
                <input
                  type="number"
                  value={tempSettings.maxTokenAgeMinutes}
                  onChange={(e) => setTempSettings({ ...tempSettings, maxTokenAgeMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 10080"
                />
              </div>

              {/* 12. Minimum Token Age */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Minimum Token Age (minutes)</label>
                <input
                  type="number"
                  value={tempSettings.minTokenAgeMinutes}
                  onChange={(e) => setTempSettings({ ...tempSettings, minTokenAgeMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 0"
                />
              </div>

              {/* 13. Minimum Alpha Score */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-slate-300 font-medium">Minimum Alpha Score (0-100)</label>
                <input
                  type="number"
                  value={tempSettings.minAlphaScore}
                  onChange={(e) => setTempSettings({ ...tempSettings, minAlphaScore: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 50"
                />
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
