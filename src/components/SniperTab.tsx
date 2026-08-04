import React, { useState } from 'react';
import { SniperConfig, Token } from '../types';
import { TokenAddressBar } from './TokenAddressBar';
import { 
  Crosshair, 
  Radio, 
  Play, 
  Square, 
  Sliders, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  ShoppingCart, 
  BarChart2, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Activity,
  Layers,
  FlaskConical,
  X,
  TrendingUp,
  Coins,
  DollarSign
} from 'lucide-react';

interface SniperTabProps {
  sniperConfig: SniperConfig;
  onUpdateConfig: (newConfig: Partial<SniperConfig>) => void;
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  scannedTokens: Token[];
  matchedTokens: Token[];
  onQuickBuy: (token: Token) => void;
  onOpenChart: (token: Token) => void;
}

export const SniperTab: React.FC<SniperTabProps> = ({
  sniperConfig,
  onUpdateConfig,
  isMonitoring,
  onToggleMonitoring,
  scannedTokens,
  matchedTokens,
  onQuickBuy,
  onOpenChart,
}) => {
  const [showConfigDrawer, setShowConfigDrawer] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);

  const handleRunDryRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setShowTestModal(true);
    try {
      const res = await fetch('/api/gmgn/trade/test-dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      console.error('Failed to run dry-run test:', err);
      setTestResult({
        success: false,
        error: 'Network error executing dry run test',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
            <Crosshair className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-tight">GMGN Sniper Bot</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                GMGN TRENCHES FEED (SOLANA)
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
                isMonitoring
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                <Radio className={`w-3 h-3 ${isMonitoring ? 'text-emerald-400' : 'text-slate-500'}`} />
                {isMonitoring ? 'CONTINUOUS MONITORING ON' : 'PAUSED'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Continuously scans newly created token pool mints from the GMGN Solana Trenches Feed, executing instant LP security, bundler & dev audit verification before auto-triggering buy orders.
            </p>
          </div>
        </div>

        {/* Action Toggle & Presets */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRunDryRunTest}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-900/30 transition-all hover:scale-105"
            title="Test Buy & Sell order execution end-to-end without real SOL purchase"
          >
            <FlaskConical className="w-4 h-4 text-purple-200" />
            <span>Test Buy/Sell System (Dry Run)</span>
          </button>

          <button
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
          >
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>{showConfigDrawer ? 'Hide Filters' : 'Adjust Criteria'}</span>
          </button>

          <button
            onClick={onToggleMonitoring}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all ${
              isMonitoring
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/50'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20 hover:scale-105'
            }`}
          >
            {isMonitoring ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>STOP CONTINUOUS MONITOR</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>START CONTINUOUS MONITOR</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Config Form Panel */}
      {showConfigDrawer && (
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-white">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Sniper Filter & Safety Thresholds</span>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Presets:</span>
              <button
                onClick={() =>
                  onUpdateConfig({
                    minLiquidityUsd: 25000,
                    maxBundlePercent: 5.0,
                    maxDevHoldingPercent: 1.5,
                    minBuyPressurePercent: 75,
                    minSmartMoneyCount: 5,
                    minKolCount: 2,
                    minAlphaScore: 90,
                    maxTokensToSnipe: 3,
                    maxGasFeeSol: 0.003,
                    takeProfitPercent: 150,
                    stopLossPercent: 15,
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono text-[11px] border border-slate-700"
              >
                🛡️ Ultra Safe
              </button>

              <button
                onClick={() =>
                  onUpdateConfig({
                    minLiquidityUsd: 15000,
                    maxBundlePercent: 10.0,
                    maxDevHoldingPercent: 3.0,
                    minBuyPressurePercent: 65,
                    minSmartMoneyCount: 2,
                    minKolCount: 1,
                    minAlphaScore: 80,
                    maxTokensToSnipe: 5,
                    maxGasFeeSol: 0.005,
                    takeProfitPercent: 100,
                    stopLossPercent: 25,
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[11px] border border-slate-700"
              >
                ⚖️ Balanced Degen
              </button>

              <button
                onClick={() =>
                  onUpdateConfig({
                    minLiquidityUsd: 5000,
                    maxBundlePercent: 20.0,
                    maxDevHoldingPercent: 10.0,
                    minBuyPressurePercent: 50,
                    minSmartMoneyCount: 1,
                    minKolCount: 0,
                    minAlphaScore: 65,
                    maxTokensToSnipe: 10,
                    maxGasFeeSol: 0.01,
                    takeProfitPercent: 200,
                    stopLossPercent: 35,
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-red-400 font-mono text-[11px] border border-slate-700"
              >
                🔥 Aggressive Alpha
              </button>
            </div>
          </div>

          {/* SECTION 1: Safety & Audit Filters */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Token Audit & Liquidity Filters</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Field 0: Min Market Cap */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Min Market Cap ($ USD)</label>
                <input
                  type="number"
                  value={sniperConfig.minMarketCapUsd ?? 0}
                  onChange={(e) => onUpdateConfig({ minMarketCapUsd: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="0 (Allows <$10k MC)"
                />
              </div>

              {/* Field 1: Min Liquidity */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Min Liquidity ($ USD)</label>
                <input
                  type="number"
                  value={sniperConfig.minLiquidityUsd}
                  onChange={(e) => onUpdateConfig({ minLiquidityUsd: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Field 2: Max Bundle % */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Max Bundle Allocation (%)</label>
                <input
                  type="number"
                  value={sniperConfig.maxBundlePercent}
                  onChange={(e) => onUpdateConfig({ maxBundlePercent: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Field 3: Max Dev Holding % */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Max Dev Holding (%)</label>
                <input
                  type="number"
                  value={sniperConfig.maxDevHoldingPercent}
                  onChange={(e) => onUpdateConfig({ maxDevHoldingPercent: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Field 4: Min Buy Pressure % */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Min Buy Pressure (%)</label>
                <input
                  type="number"
                  value={sniperConfig.minBuyPressurePercent}
                  onChange={(e) => onUpdateConfig({ minBuyPressurePercent: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Field 5: Smart Money Min */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Min Smart Money Whales</label>
                <input
                  type="number"
                  value={sniperConfig.minSmartMoneyCount}
                  onChange={(e) => onUpdateConfig({ minSmartMoneyCount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Field 6: KOL Min */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Min KOL Callers</label>
                <input
                  type="number"
                  value={sniperConfig.minKolCount}
                  onChange={(e) => onUpdateConfig({ minKolCount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Field 7: Min Alpha Score */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Min Alpha AI Score (0-100)</label>
                <input
                  type="number"
                  value={sniperConfig.minAlphaScore}
                  onChange={(e) => onUpdateConfig({ minAlphaScore: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Field 8: Auto Buy Amount SOL */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Auto-Snipe Order Size (SOL)</label>
                <input
                  type="number"
                  step="0.1"
                  value={sniperConfig.buyAmountSol}
                  onChange={(e) => onUpdateConfig({ buyAmountSol: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg px-3 py-2 font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Snipe Quota & Gas Fee Filters */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Snipe Quota & Gas Fee Filters (GMGN Standard)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Field 9: Tokens to Snipe/Buy Limit */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tokens to Snipe / Buy Limit</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">1 - 50</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={sniperConfig.maxTokensToSnipe ?? 5}
                  onChange={(e) => onUpdateConfig({ maxTokensToSnipe: Math.max(1, Number(e.target.value)) })}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-2 font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                  placeholder="5"
                />
                <p className="text-[10px] text-slate-500">Maximum concurrent token buys permitted per session.</p>
              </div>

              {/* Field 10: Gas Fee Filter / Priority Tip */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Max Gas Fee / Priority Tip (SOL)</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">SOL Tip</span>
                </div>
                <input
                  type="number"
                  step="0.001"
                  value={sniperConfig.maxGasFeeSol ?? 0.005}
                  onChange={(e) => onUpdateConfig({ maxGasFeeSol: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-2 font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                  placeholder="0.005"
                />
                <p className="text-[10px] text-slate-500">Maximum priority fee cap per tx to guarantee speed without overpaying.</p>
              </div>

              {/* Field 11: Max Slippage % */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Max Slippage Tolerance (%)</label>
                <input
                  type="number"
                  value={sniperConfig.slippagePercent ?? 15}
                  onChange={(e) => onUpdateConfig({ slippagePercent: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500">Protects against frontrunning and excessive price impact.</p>
              </div>
            </div>
          </div>

          {/* SECTION 3: Auto Sell TP/SL Filters */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                <span>Auto Sell TP/SL Filters & Risk Management</span>
              </h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-slate-300">Auto-Sell Active</span>
                <input
                  type="checkbox"
                  checked={sniperConfig.autoSellEnabled ?? true}
                  onChange={(e) => onUpdateConfig({ autoSellEnabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-purple-500 cursor-pointer"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Take Profit % */}
              <div className="space-y-1">
                <label className="text-emerald-400 font-semibold">Take Profit Target (+%)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={sniperConfig.takeProfitPercent ?? 100}
                    onChange={(e) => onUpdateConfig({ takeProfitPercent: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-emerald-500/40 rounded-lg px-3 py-2 font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
                  />
                  <span className="absolute right-3 top-2 text-emerald-500 font-mono font-bold">%</span>
                </div>
                <p className="text-[10px] text-slate-500">Auto-sells position when price gains reach TP.</p>
              </div>

              {/* Stop Loss % */}
              <div className="space-y-1">
                <label className="text-red-400 font-semibold">Stop Loss Limit (-%)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={sniperConfig.stopLossPercent ?? 25}
                    onChange={(e) => onUpdateConfig({ stopLossPercent: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-red-500/40 rounded-lg px-3 py-2 font-mono font-bold text-red-300 focus:outline-none focus:border-red-400"
                  />
                  <span className="absolute right-3 top-2 text-red-500 font-mono font-bold">%</span>
                </div>
                <p className="text-[10px] text-slate-500">Auto-cuts position if price drops to SL limit.</p>
              </div>

              {/* Trailing Stop Loss % */}
              <div className="space-y-1">
                <label className="text-purple-400 font-semibold">Trailing Stop Loss (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={sniperConfig.trailingStopLossPercent ?? 10}
                    onChange={(e) => onUpdateConfig({ trailingStopLossPercent: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-purple-500/40 rounded-lg px-3 py-2 font-mono font-bold text-purple-300 focus:outline-none focus:border-purple-400"
                  />
                  <span className="absolute right-3 top-2 text-purple-500 font-mono font-bold">%</span>
                </div>
                <p className="text-[10px] text-slate-500">Trails peak price to lock in profits on pullbacks.</p>
              </div>

              {/* Auto Exit Timeout (Minutes) */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Auto Exit Timeout (Mins)</span>
                </label>
                <input
                  type="number"
                  value={sniperConfig.autoSellTimeoutMinutes ?? 30}
                  onChange={(e) => onUpdateConfig({ autoSellTimeoutMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-slate-500">Closes stagnant positions after max duration.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Matched & Sniped Targets Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-white">Live Qualified Targets ({matchedTokens.length})</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Auto-filtered by GMGN Security Audit</span>
        </div>

        {matchedTokens.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 space-y-2">
            <Radio className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
            <div className="font-semibold text-slate-300">Scanning Memecoin Stream...</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No new tokens currently match all your strict safety criteria. Enable continuous monitoring or adjust filter limits above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchedTokens.map((token, index) => (
              <div
                key={`${token.id}-${index}`}
                className="bg-slate-900 rounded-2xl border border-emerald-500/30 p-4 shadow-xl hover:border-emerald-500 transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 px-3 py-0.5 bg-emerald-500 text-slate-950 font-bold text-[10px] rounded-bl-xl font-mono">
                  SNIPER QUALIFIED
                </div>

                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{token.logoUrl || '🪙'}</span>
                    <div>
                      <h4 className="font-bold text-base text-white">{token.name}</h4>
                      <div className="text-xs font-mono text-emerald-400 font-semibold">${token.symbol}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-white">${(token.priceUsd ?? 0).toFixed(6)}</div>
                    {(() => {
                      const pChange = token.priceChangePercent?.['1h'] ?? token.priceChangePercent?.['5m'] ?? 0;
                      return (
                        <div className={`text-xs font-mono font-bold ${(pChange ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {(pChange ?? 0) >= 0 ? '+' : ''}{(pChange ?? 0).toFixed(1)}%
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Audit Pill Tags */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 mb-3">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>LP: Locked ({(token.audit?.lpLockPercent ?? 100)}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Layers className="w-3.5 h-3.5 text-teal-400" />
                    <span>Bundle: {(token.audit?.bundlePercent ?? 0).toFixed(2)}% (Below {sniperConfig.maxBundlePercent}% limit)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Alpha AI: {token.alphaScore ?? 'N/A'}/100</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    <span>Gas Tip Cap: {sniperConfig.maxGasFeeSol} SOL</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                  <TokenAddressBar address={token.address} symbol={token.symbol} className="max-w-[180px]" />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenChart(token)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                      title="View Live Kline Chart"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onQuickBuy(token)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>SNIPE ({sniperConfig.buyAmountSol} SOL)</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DRY RUN END-TO-END TEST MODAL */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>GMGN Buy/Sell System Dry Run Test</span>
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-mono">
                      NO REAL PURCHASE
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Simulates full end-to-end trading pipeline including Gas Fee limits, Snipe Quotas & Auto-Sell TP/SL triggers.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Test Status Indicator */}
            {isTesting ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400 animate-spin">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="font-bold text-sm text-purple-300">Executing End-to-End Dry Run Simulation...</div>
                <p className="text-xs text-slate-500">
                  Validating GMGN RPC Gas Tip ({sniperConfig.maxGasFeeSol} SOL cap), Slippage ({sniperConfig.slippagePercent}%), Buy execution, Position tracking, and Auto TP (+{sniperConfig.takeProfitPercent}%) / SL (-{sniperConfig.stopLossPercent}%) rules.
                </p>
              </div>
            ) : testResult ? (
              <div className="space-y-4">
                {/* Result Card */}
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-extrabold text-sm text-emerald-300">
                        {testResult.message || 'End-to-End System Test Passed!'}
                      </div>
                      <p className="text-xs text-emerald-400/80">
                        All GMGN API buy/sell rules, gas fee caps, snipe limits, and auto-sell TP/SL triggers executed flawlessly in dry-run mode.
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs font-mono">
                      0 REAL SOL SPENT
                    </span>
                  </div>
                </div>

                {/* Audit Details Summary */}
                {testResult.auditReport && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <div className="text-slate-500 text-[10px]">Snipe Quota Limit</div>
                      <div className="font-bold text-amber-300">{testResult.auditReport.maxTokensToSnipeLimit} Tokens</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px]">Gas Tip Cap</div>
                      <div className="font-bold text-amber-300">{testResult.auditReport.gasFeeSolLimit} SOL</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px]">TP Target / SL Limit</div>
                      <div className="font-bold text-emerald-400">+{testResult.auditReport.takeProfitPercent}% / -{testResult.auditReport.stopLossPercent}%</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px]">Simulated PnL</div>
                      <div className="font-bold text-emerald-400">+${(testResult.auditReport.simulatedPnlUsd ?? 0).toFixed(2)} USD</div>
                    </div>
                  </div>
                )}

                {/* Step Logs */}
                {testResult.logs && (
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-300">Step-by-Step Execution Verification Log:</div>
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 font-mono text-[11px] space-y-1.5 text-slate-300 max-h-48 overflow-y-auto">
                      {testResult.logs.map((log: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-purple-400 font-bold">›</span>
                          <span className={log.includes('CONFIRM') || log.includes('COMPLETE') ? 'text-emerald-400 font-semibold' : ''}>
                            {log}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px]">GMGN API Verification • Dry Run Engine</span>
              <button
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all"
              >
                Close Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
