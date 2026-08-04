import React from 'react';
import { ExecutionMode } from '../types';
import { 
  Zap, 
  ShieldAlert, 
  Lock, 
  Radio, 
  Flame, 
  Crosshair, 
  Wallet, 
  BarChart2, 
  Settings, 
  Power,
  RefreshCw,
  Sparkles,
  Bot
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'alpha' | 'sniper' | 'wallet' | 'chart' | 'settings' | 'skills';
  setActiveTab: (tab: 'alpha' | 'sniper' | 'wallet' | 'chart' | 'settings' | 'skills') => void;
  executionMode: ExecutionMode;
  onToggleExecutionMode: () => void;
  onOpenLiveAuth?: () => void;
  isKillSwitchActive: boolean;
  onToggleKillSwitch: () => void;
  isSniperMonitoring: boolean;
  solBalance: number;
  solPriceUsd: number;
  totalPortfolioValueUsd: number;
  onRefreshData: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  executionMode,
  onToggleExecutionMode,
  onOpenLiveAuth,
  isKillSwitchActive,
  onToggleKillSwitch,
  isSniperMonitoring,
  solBalance,
  solPriceUsd,
  totalPortfolioValueUsd,
  onRefreshData,
  isRefreshing,
}) => {
  return (
    <header className="bg-slate-950 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-xl">
      {/* Top Banner for Protection Mode */}
      <div className={`px-4 py-1 text-xs font-semibold flex items-center justify-between border-b ${
        isKillSwitchActive
          ? 'bg-red-950/80 text-red-300 border-red-800 animate-pulse'
          : executionMode === 'LIVE'
          ? 'bg-amber-950/70 text-amber-300 border-amber-800'
          : 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
      }`}>
        <div className="flex items-center gap-2">
          {isKillSwitchActive ? (
            <span className="flex items-center gap-1 text-red-400 font-bold">
              <ShieldAlert className="w-3.5 h-3.5" />
              EMERGENCY KILL SWITCH ACTIVE — ALL TRADING FROZEN
            </span>
          ) : executionMode === 'LIVE' ? (
            <span className="flex items-center gap-1.5 text-amber-300">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              LIVE EXECUTION ACTIVE (Real Wallet & RPC Trading)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-300">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              SHADOW MODE ACTIVE (Safe Paper Trading Simulation)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Continuous Scanner Status Pill */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
            <Radio className={`w-3 h-3 ${isSniperMonitoring ? 'text-emerald-400 animate-ping' : 'text-slate-500'}`} />
            <span className="text-slate-300">Sniper Scanner:</span>
            <span className={`font-mono font-bold ${isSniperMonitoring ? 'text-emerald-400' : 'text-slate-500'}`}>
              {isSniperMonitoring ? 'ACTIVE' : 'IDLE'}
            </span>
          </div>

          {/* Quick AI Agent CLI Config Button */}
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-[11px] font-mono text-emerald-400 font-bold transition-all shadow-sm"
            title="Open GMGN AI Agent Terminal & Chat Bot"
          >
            <Settings className="w-3 h-3 text-emerald-400" />
            <span>$ gmgn-cli agent</span>
          </button>

          {/* Mode Switcher Button */}
          <button
            onClick={onToggleExecutionMode}
            className={`px-3 py-0.5 rounded-md text-[11px] font-bold tracking-wide transition-all border flex items-center gap-1.5 shadow-sm ${
              executionMode === 'LIVE'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 font-extrabold'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30 font-extrabold'
            }`}
            title="Click to instantly switch execution mode between LIVE and SHADOW"
          >
            {executionMode === 'LIVE' ? (
              <>
                <Lock className="w-3 h-3 text-amber-400" />
                <span>🔒 SWITCH TO SHADOW</span>
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>⚡ GO LIVE</span>
              </>
            )}
          </button>

          {/* Emergency Kill Switch */}
          <button
            onClick={onToggleKillSwitch}
            className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
              isKillSwitchActive
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/50'
                : 'bg-slate-800 text-red-400 hover:bg-red-950/60 hover:text-red-300 border border-red-900/40'
            }`}
            title="Instantly stop all automated sniping and freeze trading"
          >
            <Power className="w-3 h-3" />
            {isKillSwitchActive ? 'UNFREEZE' : 'KILL SWITCH'}
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-0.5 shadow-lg shadow-emerald-950">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                GMGN AI TRADER
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PRO v3.2
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Solana AI Meme Coin Alpha & Sniper Engine</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('alpha')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'alpha'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>🧠 Alpha Explorer</span>
          </button>

          <button
            onClick={() => setActiveTab('sniper')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'sniper'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            <span>🎯 Sniper</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'wallet'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>💼 Wallet</span>
          </button>

          <button
            onClick={() => setActiveTab('chart')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'chart'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>📊 Charts</span>
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all border ${
              activeTab === 'skills'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold border-emerald-400'
                : 'text-emerald-300 hover:text-white bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>🤖 AI Skills Hub</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>🤖 AI Agent</span>
          </button>
        </nav>

        {/* Right Info: SOL Balance & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <div className="text-right">
              <div className="font-mono font-bold text-emerald-400">
                {(solBalance ?? 0).toFixed(3)} SOL
              </div>
              <div className="text-[10px] text-slate-400">
                ≈ ${(totalPortfolioValueUsd ?? 0).toFixed(2)} USD
              </div>
            </div>
            <div className="text-[10px] text-slate-500 border-l border-slate-800 pl-2">
              SOL @ ${solPriceUsd}
            </div>
          </div>

          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all disabled:opacity-50"
            title="Refresh GMGN market data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
