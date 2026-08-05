import React, { useState, useEffect } from 'react';
import { GoogleAuthGate } from './components/GoogleAuthGate';
import { Navbar } from './components/Navbar';
import { AlphaExplorer } from './components/AlphaExplorer';
import { SniperTab } from './components/SniperTab';
import { WalletTab } from './components/WalletTab';
import { SettingsTab } from './components/SettingsTab';
import { SkillsHubTab } from './components/SkillsHubTab';
import { AiAgentTab } from './components/AiAgentTab';
import { KlineChartModal } from './components/KlineChartModal';
import { AiAnalysisModal } from './components/AiAnalysisModal';
import { LiveAuthModal } from './components/LiveAuthModal';
import { QuickBuyModal } from './components/QuickBuyModal';
import { Token, Timeframe, SniperConfig, WalletPosition, TradeOrder, ExecutionMode, SiteAppearanceConfig } from './types';
import { DEFAULT_SNIPER_CONFIG } from './data/initialData';

export default function App() {
  const [activeTab, setActiveTab] = useState<'alpha' | 'sniper' | 'wallet' | 'chart' | 'settings' | 'skills'>('alpha');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('15m');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Site Appearance Config State
  const [siteAppearance, setSiteAppearance] = useState<SiteAppearanceConfig>({
    themeStyle: 'EMERALD_PRO',
    accentColor: '#10b981',
    fontFamily: 'Inter',
    compactMode: false,
    customCss: '',
  });

  // Sniper state
  const [sniperConfig, setSniperConfig] = useState<SniperConfig>(DEFAULT_SNIPER_CONFIG);
  const [scannedTokens, setScannedTokens] = useState<Token[]>([]);
  const [matchedTokens, setMatchedTokens] = useState<Token[]>([]);

  // Wallet state
  const [walletSolBalance, setWalletSolBalance] = useState(14.85);
  const [solPriceUsd, setSolPriceUsd] = useState(200);
  const [totalPositionValueUsd, setTotalPositionValueUsd] = useState(0);
  const [totalPortfolioValueUsd, setTotalPortfolioValueUsd] = useState(0);
  const [totalUnrealizedPnLUsd, setTotalUnrealizedPnLUsd] = useState(0);
  const [positions, setPositions] = useState<WalletPosition[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeOrder[]>([]);
  const [boundWalletAddress, setBoundWalletAddress] = useState<string>('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');
  const [isEnvWalletConfigured, setIsEnvWalletConfigured] = useState<boolean>(false);

  // Mode & Security
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('SHADOW');
  const [isKillSwitchActive, setIsKillSwitchActive] = useState(false);

  // Modals state
  const [chartToken, setChartToken] = useState<Token | null>(null);
  const [aiToken, setAiToken] = useState<Token | null>(null);
  const [quickBuyToken, setQuickBuyToken] = useState<Token | null>(null);
  const [showLiveAuthModal, setShowLiveAuthModal] = useState(false);

  // Fetch Alpha Tokens based on selected timeframe
  const fetchAlphaTokens = async (tf: Timeframe) => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/gmgn/tokens/alpha?timeframe=${tf}`);
      if (res.ok) {
        const json = await res.json();
        if (json.tokens) {
          setTokens(json.tokens);
        }
      }
    } catch (err) {
      // Gracefully handle transient network glitches
    } finally {
      setIsRefreshing(false);
    }
  };

  // Start AI ranking job and poll progress; returns progress id
  const startAiRanking = async (required = 20) => {
    try {
      const startRes = await fetch(`/api/gmgn/ai-rank/start?required=${required}`, { method: 'POST' });
      if (!startRes.ok) return null;
      const j = await startRes.json();
      const id = j.progressId as string;
      // poll status
      const poll = setInterval(async () => {
        try {
          const st = await fetch(`/api/gmgn/ai-rank/status/${id}`);
          if (!st.ok) return;
          const sjson = await st.json();
          setAiRankProgress(sjson);
          if (sjson.status === 'done' || sjson.status === 'failed') {
            clearInterval(poll);
            // refresh tokens to pick up updated alphaScore
            fetchAlphaTokens(selectedTimeframe);
          }
        } catch (e) {}
      }, 2000);
      return id;
    } catch (e) {
      return null;
    }
  };

  // State for AI rank progress
  const [aiRankProgress, setAiRankProgress] = useState<any>(null);

  // Initial Load & Timeframe Change
  useEffect(() => {
    fetchAlphaTokens(selectedTimeframe);
    fetchSniperStatus();
    fetchWalletState();
    fetchSiteAppearance();
    // start AI ranking in background for top 20
    (async () => { const pid = await startAiRanking(20); if (pid) console.log('AI ranking started', pid); })();
  }, [selectedTimeframe]);

  // Fetch Sniper Scan Status
  const fetchSniperStatus = async () => {
    try {
      const res = await fetch('/api/gmgn/tokens/sniper-scan');
      if (res.ok) {
        const json = await res.json();
        if (json.allScannedTokens) setScannedTokens(json.allScannedTokens);
        if (json.matchedTokens) setMatchedTokens(json.matchedTokens);
        if (json.config) setSniperConfig(json.config);
        if (typeof json.isKillSwitchActive === 'boolean') setIsKillSwitchActive(json.isKillSwitchActive);
      }
    } catch (err) {
      // Gracefully handle transient network glitches
    }
  };

  // Fetch Wallet State
  const fetchWalletState = async () => {
    try {
      const res = await fetch('/api/gmgn/wallet');
      if (res.ok) {
        const json = await res.json();
        if (json.boundWalletAddress) setBoundWalletAddress(json.boundWalletAddress);
        if (typeof json.isEnvWalletConfigured === 'boolean') setIsEnvWalletConfigured(json.isEnvWalletConfigured);
        if (json.solBalance !== undefined) setWalletSolBalance(json.solBalance);
        if (json.solPriceUsd) setSolPriceUsd(json.solPriceUsd);
        if (json.totalPositionValueUsd !== undefined) setTotalPositionValueUsd(json.totalPositionValueUsd);
        if (json.totalPortfolioValueUsd !== undefined) setTotalPortfolioValueUsd(json.totalPortfolioValueUsd);
        if (json.totalUnrealizedPnLUsd !== undefined) setTotalUnrealizedPnLUsd(json.totalUnrealizedPnLUsd);
        if (json.positions) setPositions(json.positions);
        if (json.tradeHistory) setTradeHistory(json.tradeHistory);
        if (json.executionMode) setExecutionMode(json.executionMode);
        if (typeof json.isKillSwitchActive === 'boolean') setIsKillSwitchActive(json.isKillSwitchActive);
      }
    } catch (err) {
      // Gracefully handle transient network glitches
    }
  };

  // Fetch Site Appearance
  const fetchSiteAppearance = async () => {
    try {
      const res = await fetch('/api/site/appearance');
      if (res.ok) {
        const json = await res.json();
        if (json.siteAppearanceConfig) {
          setSiteAppearance(json.siteAppearanceConfig);
        }
      }
    } catch (err) {
      // Gracefully handle transient network glitches
    }
  };

  // Update Site Appearance
  const handleUpdateSiteAppearance = async (newConfig: Partial<SiteAppearanceConfig>) => {
    const updated = { ...siteAppearance, ...newConfig };
    setSiteAppearance(updated);
    try {
      await fetch('/api/site/appearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error('Failed updating site appearance:', err);
    }
  };

  // Initial Load & Timeframe Change
  useEffect(() => {
    fetchAlphaTokens(selectedTimeframe);
    fetchSniperStatus();
    fetchWalletState();
    fetchSiteAppearance();
  }, [selectedTimeframe]);

  // Periodic Auto Refresh (12s polling)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchAlphaTokens(selectedTimeframe);
      fetchSniperStatus();
      fetchWalletState();
    }, 12000);
    return () => clearInterval(timer);
  }, [selectedTimeframe]);

  // Trade Execution Helper
  const handleExecuteTrade = async (tokenId: string, type: 'BUY' | 'SELL', amountSol?: number, sellPercent?: number) => {
    try {
      const res = await fetch('/api/gmgn/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId, type, amountSol, sellPercent }),
      });
      const json = await res.json();

      if (!res.ok) {
        alert(`Trade Execution Failed: ${json.error || 'Unknown error'}`);
        return;
      }

      // Refresh wallet & tokens state
      await fetchWalletState();
      await fetchAlphaTokens(selectedTimeframe);
    } catch (err) {
      console.error('Error executing trade:', err);
      alert('Trade Execution Network Error');
    }
  };

  // Update Sniper Config
  const handleUpdateSniperConfig = async (newConfig: Partial<SniperConfig>) => {
    const updated = { ...sniperConfig, ...newConfig };
    setSniperConfig(updated);
    try {
      await fetch('/api/gmgn/sniper/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      fetchSniperStatus();
    } catch (err) {
      console.error('Failed updating sniper config:', err);
    }
  };

  // Toggle Continuous Monitoring
  const handleToggleSniperMonitoring = () => {
    handleUpdateSniperConfig({ isContinuousMonitoring: !sniperConfig.isContinuousMonitoring });
  };

  // Toggle Kill Switch
  const handleToggleKillSwitch = async () => {
    const nextState = !isKillSwitchActive;
    try {
      const res = await fetch('/api/trader/killswitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextState }),
      });
      const json = await res.json();
      setIsKillSwitchActive(json.isKillSwitchActive);
      setExecutionMode(json.executionMode);
      fetchWalletState();
    } catch (err) {
      console.error('Failed toggling kill switch:', err);
    }
  };

  // Toggle Execution Mode Directly (GO LIVE / SWITCH TO SHADOW)
  const handleToggleExecutionMode = async () => {
    const targetMode: ExecutionMode = executionMode === 'LIVE' ? 'SHADOW' : 'LIVE';
    try {
      const res = await fetch('/api/trader/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: targetMode, password: 'gmgn2026' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setExecutionMode(json.mode);
        await fetchWalletState();
      } else {
        alert(json.error || 'Failed to toggle execution mode');
      }
    } catch (err) {
      console.error('Failed toggling execution mode:', err);
    }
  };

  // Auth Mode Confirm
  const handleConfirmAuth = async (password: string, targetMode: ExecutionMode): Promise<boolean> => {
    try {
      const res = await fetch('/api/trader/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, mode: targetMode }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setExecutionMode(json.mode);
        fetchWalletState();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Auth error:', err);
      return false;
    }
  };

  // Faucet Deposit SOL
  const handleAddSol = (amt: number) => {
    setWalletSolBalance(prev => prev + amt);
  };

  return (
    <GoogleAuthGate>
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        executionMode={executionMode}
        onToggleExecutionMode={handleToggleExecutionMode}
        onOpenLiveAuth={() => setShowLiveAuthModal(true)}
        isKillSwitchActive={isKillSwitchActive}
        onToggleKillSwitch={handleToggleKillSwitch}
        isSniperMonitoring={sniperConfig.isContinuousMonitoring}
        solBalance={walletSolBalance}
        solPriceUsd={solPriceUsd}
        totalPortfolioValueUsd={totalPortfolioValueUsd}
        onRefreshData={() => {
          fetchAlphaTokens(selectedTimeframe);
          fetchSniperStatus();
          fetchWalletState();
        }}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'alpha' && (
          <AlphaExplorer
            tokens={tokens}
            selectedTimeframe={selectedTimeframe}
            onTimeframeChange={(tf) => setSelectedTimeframe(tf)}
            onQuickBuy={(token) => setQuickBuyToken(token)}
            onOpenChart={(token) => setChartToken(token)}
            onAnalyzeAi={(token) => setAiToken(token)}
            onRefreshData={() => {
              fetchAlphaTokens(selectedTimeframe);
              fetchSniperStatus();
            }}
            isRefreshing={isRefreshing}
            aiRankProgress={aiRankProgress}
          />
        )}

        {activeTab === 'sniper' && (
          <SniperTab
            sniperConfig={sniperConfig}
            onUpdateConfig={handleUpdateSniperConfig}
            isMonitoring={sniperConfig.isContinuousMonitoring}
            onToggleMonitoring={handleToggleSniperMonitoring}
            scannedTokens={scannedTokens}
            matchedTokens={matchedTokens}
            onQuickBuy={(token) => setQuickBuyToken(token)}
            onOpenChart={(token) => setChartToken(token)}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletTab
            solBalance={walletSolBalance}
            solPriceUsd={solPriceUsd}
            solValueUsd={walletSolBalance * solPriceUsd}
            totalPositionValueUsd={totalPositionValueUsd}
            totalPortfolioValueUsd={totalPortfolioValueUsd}
            totalUnrealizedPnLUsd={totalUnrealizedPnLUsd}
            positions={positions}
            tradeHistory={tradeHistory}
            executionMode={executionMode}
            boundWalletAddress={boundWalletAddress}
            isEnvWalletConfigured={isEnvWalletConfigured}
            onQuickSell={(symbol, sellPercent) => handleExecuteTrade(symbol, 'SELL', undefined, sellPercent)}
            onAddSol={handleAddSol}
            onOpenChartBySymbol={(symbol) => {
              const matched = tokens.find(t => t.symbol === symbol);
              if (matched) setChartToken(matched);
            }}
            onSyncWallet={fetchWalletState}
          />
        )}

        {activeTab === 'chart' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4">
            <h2 className="text-xl font-bold text-white">Full K-Line Technical Analytics Terminal</h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Select any token from Alpha Explorer or Sniper to view interactive candlestick charts, MA overlays, and Smart Money order flow markers.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {tokens.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setChartToken(t)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono border border-slate-700 flex items-center gap-2"
                >
                  <span>{t.logoUrl || '🪙'}</span>
                  <span>${t.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <SkillsHubTab
            siteAppearance={siteAppearance}
            onUpdateSiteAppearance={handleUpdateSiteAppearance}
            onRefreshWalletState={fetchWalletState}
          />
        )}

        {activeTab === 'settings' && (
          <AiAgentTab 
            executionMode={executionMode} 
            siteAppearance={siteAppearance}
            onUpdateSiteAppearance={handleUpdateSiteAppearance}
            onRefreshWalletState={fetchWalletState}
          />
        )}
      </main>

      {/* Modals */}
      {chartToken && (
        <KlineChartModal
          token={chartToken}
          onClose={() => setChartToken(null)}
          onExecuteTrade={handleExecuteTrade}
          executionMode={executionMode}
        />
      )}

      {aiToken && (
        <AiAnalysisModal
          token={aiToken}
          onClose={() => setAiToken(null)}
          onQuickBuy={(token) => setQuickBuyToken(token)}
        />
      )}

      {quickBuyToken && (
        <QuickBuyModal
          token={quickBuyToken}
          onClose={() => setQuickBuyToken(null)}
          onConfirmBuy={(tokenId, amountSol) => handleExecuteTrade(tokenId, 'BUY', amountSol)}
          executionMode={executionMode}
          solBalance={walletSolBalance}
        />
      )}

      {showLiveAuthModal && (
        <LiveAuthModal
          currentMode={executionMode}
          onClose={() => setShowLiveAuthModal(false)}
          onConfirmAuth={handleConfirmAuth}
        />
      )}
    </div>
    </GoogleAuthGate>
  );
}
