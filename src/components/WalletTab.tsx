import React, { useState } from 'react';
import { WalletPosition, TradeOrder, ExecutionMode } from '../types';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Plus, 
  Minus, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  Zap, 
  RefreshCw,
  ShoppingCart
} from 'lucide-react';

interface WalletTabProps {
  solBalance: number;
  solPriceUsd: number;
  solValueUsd: number;
  totalPositionValueUsd: number;
  totalPortfolioValueUsd: number;
  totalUnrealizedPnLUsd: number;
  positions: WalletPosition[];
  tradeHistory: TradeOrder[];
  executionMode: ExecutionMode;
  boundWalletAddress?: string;
  isEnvWalletConfigured?: boolean;
  onQuickSell: (tokenSymbol: string, sellPercent: number) => void;
  onAddSol: (amount: number) => void;
  onOpenChartBySymbol: (symbol: string) => void;
  onSyncWallet?: () => void;
}

export const WalletTab: React.FC<WalletTabProps> = ({
  solBalance,
  solPriceUsd,
  solValueUsd,
  totalPositionValueUsd,
  totalPortfolioValueUsd,
  totalUnrealizedPnLUsd,
  positions,
  tradeHistory,
  executionMode,
  boundWalletAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  isEnvWalletConfigured = false,
  onQuickSell,
  onAddSol,
  onOpenChartBySymbol,
  onSyncWallet,
}) => {
  const [depositAmount, setDepositAmount] = useState('2.0');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [customAddressInput, setCustomAddressInput] = useState('');
  const [showAddressInputModal, setShowAddressInputModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const activeWalletAddress = connectedWallet || boundWalletAddress;

  const handleSyncWalletClick = async () => {
    if (onSyncWallet) {
      setIsSyncing(true);
      await onSyncWallet();
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  const handleCopyWalletAddress = () => {
    if (activeWalletAddress) {
      navigator.clipboard.writeText(activeWalletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  // Connect Phantom Wallet
  const handleConnectPhantom = async () => {
    setIsConnecting(true);
    try {
      const { solana } = window as any;
      if (solana && solana.isPhantom) {
        const response = await solana.connect();
        const pubKey = response.publicKey.toString();
        setConnectedWallet(pubKey);
      } else {
        setShowAddressInputModal(true);
      }
    } catch (err) {
      console.error('Phantom connection error:', err);
      setShowAddressInputModal(true);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSetCustomAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (customAddressInput.trim().length >= 32) {
      setConnectedWallet(customAddressInput.trim());
      setShowAddressInputModal(false);
    } else {
      alert('Please enter a valid Solana public key address (32+ chars)');
    }
  };

  const handleDeposit = () => {
    const val = parseFloat(depositAmount);
    if (!isNaN(val) && val > 0) {
      onAddSol(val);
      setShowDepositModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Overview Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Wallet className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">GMGN Solana Wallet & Holdings</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                executionMode === 'LIVE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {executionMode} MODE
              </span>
              {isEnvWalletConfigured && (
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-400" />
                  ENV SECRET LOADED
                </span>
              )}
            </div>

            {/* Active Bound Solana Wallet Public Key Bar */}
            <div className="mt-2 flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono max-w-xl">
              <span className="text-slate-400 text-[11px] font-sans font-bold">Solana Public Key:</span>
              <span className="text-emerald-400 font-bold break-all select-all flex-1">
                {activeWalletAddress}
              </span>
              <button
                onClick={handleCopyWalletAddress}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-sans font-semibold border border-slate-700 transition-colors shrink-0"
              >
                {copiedAddress ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {connectedWallet ? (
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-emerald-500/40 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 font-bold">
                  {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
                </span>
                <button
                  onClick={() => setConnectedWallet(null)}
                  className="text-slate-500 hover:text-red-400 text-[10px] ml-1 uppercase underline"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectPhantom}
                disabled={isConnecting}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all"
              >
                <Zap className="w-4 h-4 text-purple-300" />
                <span>{isConnecting ? 'Connecting...' : 'Connect Phantom Wallet'}</span>
              </button>
            )}

            <button
              onClick={handleSyncWalletClick}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              title="Rescan Solana RPC for live SOL balance and on-chain token holdings"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync On-Chain Wallet'}</span>
            </button>

            <button
              onClick={() => setShowDepositModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Deposit / Faucet SOL</span>
            </button>
          </div>
        </div>

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Card 1: Total Portfolio Value */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Total Portfolio Value</div>
            <div className="text-2xl font-mono font-extrabold text-white mt-1">
              ${(totalPortfolioValueUsd ?? 0).toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              {((totalPortfolioValueUsd ?? 0) / (solPriceUsd || 1)).toFixed(3)} SOL
            </div>
          </div>

          {/* Card 2: Available SOL Balance */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">SOL Liquid Balance</div>
            <div className="text-2xl font-mono font-extrabold text-emerald-400 mt-1">
              {(solBalance ?? 0).toFixed(3)} SOL
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              ≈ ${(solValueUsd ?? 0).toFixed(2)} USD
            </div>
          </div>

          {/* Card 3: Token Holdings Value */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Active Position Holdings</div>
            <div className="text-2xl font-mono font-extrabold text-cyan-400 mt-1">
              ${(totalPositionValueUsd ?? 0).toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Across {positions.length} active meme coins
            </div>
          </div>

          {/* Card 4: Total Unrealized P&L */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Total Unrealized P&L</div>
            <div className={`text-2xl font-mono font-extrabold mt-1 flex items-center gap-1 ${
              (totalUnrealizedPnLUsd ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {(totalUnrealizedPnLUsd ?? 0) >= 0 ? (
                <ArrowUpRight className="w-6 h-6" />
              ) : (
                <ArrowDownRight className="w-6 h-6" />
              )}
              {(totalUnrealizedPnLUsd ?? 0) >= 0 ? `+$${(totalUnrealizedPnLUsd ?? 0).toFixed(2)}` : `-$${Math.abs(totalUnrealizedPnLUsd ?? 0).toFixed(2)}`}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">Live Mark-to-Market</div>
          </div>
        </div>
      </div>

      {/* Active Holdings Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-white">Your GMGN Open Token Positions ({positions.length})</h3>
            <p className="text-xs text-slate-400">Click quick sell buttons for instant execution.</p>
          </div>
        </div>

        {positions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <Wallet className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="font-semibold text-slate-300">No active token positions</div>
            <p className="text-xs text-slate-500">
              Use Alpha Explorer or Sniper to buy meme coins and view your live holdings here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Asset</th>
                  <th className="p-3">Holdings</th>
                  <th className="p-3">Entry Price (SOL)</th>
                  <th className="p-3">Current Price (SOL)</th>
                  <th className="p-3">Value ($ USD)</th>
                  <th className="p-3">Unrealized P&L</th>
                  <th className="p-3 text-right">Quick Sell Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {positions.map((pos) => (
                  <tr key={pos.tokenId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2 font-sans">
                        <button
                          onClick={() => onOpenChartBySymbol(pos.tokenSymbol)}
                          className="font-bold text-white hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                        >
                          <span>${pos.tokenSymbol}</span>
                        </button>
                        <span className="text-slate-400 text-[10px] truncate max-w-[100px]">{pos.tokenName}</span>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-slate-200">
                      {(pos.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-3 text-slate-400">{(pos.entryPriceSol ?? 0).toFixed(7)}</td>
                    <td className="p-3 text-emerald-400 font-bold">{(pos.currentPriceSol ?? 0).toFixed(7)}</td>
                    <td className="p-3 font-bold text-slate-200">${(pos.currentValueUsd ?? 0).toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`font-bold inline-flex items-center gap-1 ${
                        (pos.unrealizedPnLPercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {(pos.unrealizedPnLPercent ?? 0) >= 0 ? '+' : ''}
                        {(pos.unrealizedPnLPercent ?? 0).toFixed(2)}% (${(pos.unrealizedPnLUsd ?? 0).toFixed(2)})
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {/* Quick Sell Presets */}
                      <div className="inline-flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button
                          onClick={() => onQuickSell(pos.tokenSymbol, 25)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans font-bold text-[10px] transition-colors"
                        >
                          25%
                        </button>
                        <button
                          onClick={() => onQuickSell(pos.tokenSymbol, 50)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans font-bold text-[10px] transition-colors"
                        >
                          50%
                        </button>
                        <button
                          onClick={() => onQuickSell(pos.tokenSymbol, 75)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans font-bold text-[10px] transition-colors"
                        >
                          75%
                        </button>
                        <button
                          onClick={() => onQuickSell(pos.tokenSymbol, 100)}
                          className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-sans font-extrabold text-[10px] transition-colors shadow-sm"
                        >
                          100% SELL
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction History Log */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>GMGN Trade Execution Log ({tradeHistory.length})</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">Real-time RPC Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Type</th>
                <th className="p-3">Asset</th>
                <th className="p-3">Amount (SOL)</th>
                <th className="p-3">Execution Mode</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Transaction Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {tradeHistory.map((order) => (
                <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 text-slate-400">{order.timestamp}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      order.type === 'BUY'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {order.type}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-white">${order.tokenSymbol}</td>
                  <td className="p-3 font-bold text-slate-200">{(order.amountSol ?? 0).toFixed(3)} SOL</td>
                  <td className="p-3">
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-slate-400">
                      {order.executionMode}
                    </span>
                  </td>
                  <td className="p-3 text-emerald-400 font-semibold">{order.status}</td>
                  <td className="p-3 text-right text-slate-500 hover:text-slate-300 cursor-pointer flex items-center justify-end gap-1">
                    <span>{order.txHash.slice(0, 8)}...{order.txHash.slice(-6)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-white">Deposit / Faucet SOL</h3>
            <p className="text-xs text-slate-400">
              Add simulated SOL balance to test paper trading in Shadow mode or allocate live funds.
            </p>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold">Amount SOL</label>
              <input
                type="number"
                step="0.5"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
              >
                Confirm Deposit
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Address Input Modal */}
      {showAddressInputModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSetCustomAddress} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Zap className="w-5 h-5 text-purple-400" />
              <span>Connect Solana Mainnet Wallet</span>
            </div>
            <p className="text-xs text-slate-400">
              Phantom browser extension was not detected inside this frame. Enter your Solana public wallet address (e.g., Phantom or Solflare public key) to link your wallet:
            </p>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold font-mono">Solana Wallet Address (Public Key)</label>
              <input
                type="text"
                placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                value={customAddressInput}
                onChange={(e) => setCustomAddressInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddressInputModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
              >
                Connect Wallet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
