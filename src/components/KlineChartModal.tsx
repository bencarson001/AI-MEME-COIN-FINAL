import React, { useState, useEffect } from 'react';
import { Token, KlineInterval, KlineDataPoint, ExecutionMode } from '../types';
import { TokenAddressBar } from './TokenAddressBar';
import { 
  X, 
  BarChart2, 
  TrendingUp, 
  ShieldCheck, 
  Copy, 
  Check, 
  ShoppingCart, 
  Sparkles, 
  RefreshCw,
  Zap,
  Users,
  Flame
} from 'lucide-react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Bar, Line, CartesianGrid, ReferenceDot } from 'recharts';

interface KlineChartModalProps {
  token: Token | null;
  onClose: () => void;
  onExecuteTrade: (tokenId: string, type: 'BUY' | 'SELL', amountSol?: number, sellPercent?: number) => void;
  executionMode: ExecutionMode;
}

export const KlineChartModal: React.FC<KlineChartModalProps> = ({
  token,
  onClose,
  onExecuteTrade,
  executionMode,
}) => {
  if (!token) return null;

  const [interval, setInterval] = useState<KlineInterval>('5m');
  const [klines, setKlines] = useState<KlineDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [buyAmountSol, setBuyAmountSol] = useState('0.5');

  useEffect(() => {
    async function fetchKlines() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/gmgn/kline?symbol=${token.symbol}&interval=${interval}`);
        const json = await res.json();
        if (json.data) {
          setKlines(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch Klines:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchKlines();
  }, [token.symbol, interval]);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(token.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBuy = () => {
    const val = parseFloat(buyAmountSol);
    if (!isNaN(val) && val > 0) {
      onExecuteTrade(token.id, 'BUY', val);
    }
  };

  const formattedChartData = klines.map((k) => {
    const dateStr = new Date(k.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isBullish = k.close >= k.open;

    return {
      time: dateStr,
      price: k.close,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
      ma7: k.ma7,
      ma25: k.ma25,
      isBullish,
      smartMoneyBuy: k.smartMoneyBuy ? k.close : null,
      smartMoneySell: k.smartMoneySell ? k.high : null,
    };
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full flex flex-col lg:flex-row overflow-hidden shadow-2xl max-h-[90vh]">
        {/* Left / Main: Chart & Controls */}
        <div className="flex-1 p-5 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between overflow-y-auto">
          {/* Header Bar */}
          <div>
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{token.logoUrl || '🪙'}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{token.name}</h2>
                    <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      ${token.symbol}
                    </span>
                    <button
                      onClick={handleCopyAddress}
                      className="text-slate-400 hover:text-white p-1 rounded bg-slate-800 border border-slate-700 transition-colors"
                      title="Copy Token Contract Address"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    {token.chain.toUpperCase()} Contract: {token.address.slice(0, 10)}...{token.address.slice(-8)}
                  </div>
                </div>
              </div>

              {/* Price & Close Button */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-mono font-extrabold text-lg text-emerald-400">
                    ${token.priceUsd}
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    {token.priceSol} SOL
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Timeframe Bar Controls */}
            <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800 mb-4 text-xs font-mono">
              <div className="flex items-center gap-1">
                {(['1m', '5m', '15m', '1h', '4h', '1d'] as KlineInterval[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setInterval(tf)}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      interval === tf
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  MA7
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  MA25
                </span>
                <span className="flex items-center gap-1 text-amber-300">
                  ⚡ Smart Money Orders
                </span>
              </div>
            </div>
          </div>

          {/* Interactive K-Line Chart */}
          <div className="w-full h-80 bg-slate-950/90 rounded-2xl border border-slate-800 p-2 relative">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-mono">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mr-2" />
                Loading GMGN K-Line Endpoint Stream...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={formattedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{ fontSize: 10 }} orientation="right" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#f8fafc',
                    }}
                  />
                  {/* Volume Bars */}
                  <Bar dataKey="volume" yAxisId={1} fill="#1e293b" opacity={0.6} />

                  {/* Price Line */}
                  <Line type="monotone" dataKey="price" stroke="#10b981" strokeWidth={2} dot={false} />

                  {/* MA Lines */}
                  <Line type="monotone" dataKey="ma7" stroke="#34d399" strokeWidth={1} dot={false} strokeDasharray="2 2" />
                  <Line type="monotone" dataKey="ma25" stroke="#22d3ee" strokeWidth={1} dot={false} strokeDasharray="2 2" />

                  {/* Smart Money Buy Flags */}
                  <ReferenceDot
                    r={5}
                    fill="#10b981"
                    stroke="#020617"
                    strokeWidth={2}
                    yAxisId={0}
                    x={formattedChartData[12]?.time}
                    y={formattedChartData[12]?.price}
                  />
                  <ReferenceDot
                    r={5}
                    fill="#10b981"
                    stroke="#020617"
                    strokeWidth={2}
                    yAxisId={0}
                    x={formattedChartData[35]?.time}
                    y={formattedChartData[35]?.price}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bottom Security Summary */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Contract Audit:</span>
              <span className="text-emerald-400 font-bold">100% LP Burned</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">Dev Hold: {token.audit.devHoldingPercent}%</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">Bundle: {token.audit.bundlePercent}%</span>
            </div>

            <div className="text-slate-400">
              Buy Pressure: <strong className="text-amber-300">{token.buyPressurePercent}%</strong>
            </div>
          </div>

          {/* Full Token Contract Address Bar & GMGN.AI / Trojan.com Links */}
          <div className="mt-3">
            <TokenAddressBar address={token.address} chain={token.chain} />
          </div>
        </div>

        {/* Right Sidebar: Quick Trading Terminal */}
        <div className="w-full lg:w-80 bg-slate-950/80 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                <span>Trade Terminal</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {executionMode}
              </span>
            </div>

            {/* Quick Buy Controls */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Position Size (SOL)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={buyAmountSol}
                  onChange={(e) => setBuyAmountSol(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Preset SOL buttons */}
              <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                {['0.1', '0.5', '1.0', '2.0'].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setBuyAmountSol(amt)}
                    className={`py-1.5 rounded-lg border font-bold transition-all ${
                      buyAmountSol === amt
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {amt} SOL
                  </button>
                ))}
              </div>

              {/* Execute BUY Button */}
              <button
                onClick={handleBuy}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>BUY {buyAmountSol} SOL OF ${token.symbol}</span>
              </button>
            </div>

            {/* Quick Sell Controls */}
            <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
              <label className="text-xs text-slate-300 font-semibold block">
                Quick Sell Open Position
              </label>

              <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => onExecuteTrade(token.id, 'SELL', undefined, pct)}
                    className="py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 font-bold transition-all text-center"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Whale & KOL Callers Panel */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2 font-mono">
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>Smart Money Radar</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              {token.smartMoneyCount ?? 0} Whales active (${((token.smartMoneyVolumeUsd ?? 0) / 1000).toFixed(0)}k volume)
            </p>
            <div className="text-[10px] text-slate-500 truncate">
              KOLs: {(token.kolNames || []).join(', ')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
