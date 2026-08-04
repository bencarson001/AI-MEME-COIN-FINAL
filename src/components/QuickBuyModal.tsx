import React, { useState } from 'react';
import { Token, ExecutionMode } from '../types';
import { TokenAddressBar } from './TokenAddressBar';
import { ShoppingCart, X, ShieldCheck, Zap, ArrowRight, RefreshCw } from 'lucide-react';

interface QuickBuyModalProps {
  token: Token | null;
  onClose: () => void;
  onConfirmBuy: (tokenId: string, amountSol: number) => void;
  executionMode: ExecutionMode;
  solBalance: number;
}

export const QuickBuyModal: React.FC<QuickBuyModalProps> = ({
  token,
  onClose,
  onConfirmBuy,
  executionMode,
  solBalance,
}) => {
  if (!token) return null;

  const [amountSol, setAmountSol] = useState('0.5');
  const [slippage, setSlippage] = useState('15');
  const [isBuying, setIsBuying] = useState(false);

  const solVal = parseFloat(amountSol) || 0;
  const estimatedTokens = solVal > 0 && token.priceSol ? (solVal / token.priceSol) * (1 - parseFloat(slippage) / 100) : 0;

  const handleBuy = () => {
    if (solVal <= 0) return;
    setIsBuying(true);
    setTimeout(() => {
      onConfirmBuy(token.id, solVal);
      setIsBuying(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Token Info Header */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">{token.logoUrl || '🪙'}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-white">Buy {token.name}</h3>
              <span className="text-xs font-mono font-bold text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded bg-emerald-500/10">
                ${token.symbol}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              1 SOL = {token.priceSol ? (1 / token.priceSol).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'} {token.symbol}
            </p>
          </div>
        </div>

        {/* Full Token Address with Copy & External Links */}
        <TokenAddressBar address={token.address} chain={token.chain} />

        {/* Trade Form */}
        <div className="space-y-4 text-xs font-mono">
          {/* SOL Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-slate-300 font-sans font-semibold">
              <span>Amount (SOL)</span>
              <span className="text-[11px] text-slate-400">Balance: {(solBalance ?? 0).toFixed(3)} SOL</span>
            </div>
            <input
              type="number"
              step="0.1"
              value={amountSol}
              onChange={(e) => setAmountSol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* SOL Presets */}
          <div className="grid grid-cols-4 gap-2">
            {['0.1', '0.5', '1.0', '2.0'].map((amt) => (
              <button
                key={amt}
                onClick={() => setAmountSol(amt)}
                className={`py-1.5 rounded-lg border font-bold transition-all text-center ${
                  amountSol === amt
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {amt} SOL
              </button>
            ))}
          </div>

          {/* Trade Estimate Box */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-slate-300">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Est. Tokens Received:</span>
              <span className="font-bold text-emerald-400">
                ~{estimatedTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })} {token.symbol}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Execution Mode:</span>
              <span className="font-bold text-slate-200">{executionMode} MODE</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Slippage Tolerance:</span>
              <div className="flex items-center gap-1">
                {['5', '10', '15', '20'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlippage(s)}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      slippage === s ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-3 font-sans">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
            >
              Cancel
            </button>

            <button
              onClick={handleBuy}
              disabled={isBuying || solVal <= 0 || solVal > solBalance}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isBuying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>Confirm Quick BUY</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
