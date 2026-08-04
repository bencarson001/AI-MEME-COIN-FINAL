import React, { useState } from 'react';
import { ExecutionMode } from '../types';
import { Lock, ShieldAlert, Key, X, CheckCircle2, Zap, AlertTriangle } from 'lucide-react';

interface LiveAuthModalProps {
  currentMode: ExecutionMode;
  onClose: () => void;
  onConfirmAuth: (password: string, targetMode: ExecutionMode) => Promise<boolean>;
}

export const LiveAuthModal: React.FC<LiveAuthModalProps> = ({
  currentMode,
  onClose,
  onConfirmAuth,
}) => {
  const [password, setPassword] = useState('gmgn2026');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const targetMode = currentMode === 'LIVE' ? 'SHADOW' : 'LIVE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetMode === 'LIVE' && !acceptedTerms) {
      setErrorMsg('You must acknowledge the live execution risks before enabling Live Mode.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const success = await onConfirmAuth(password, targetMode);
    setIsSubmitting(false);

    if (success) {
      onClose();
    } else {
      setErrorMsg('Invalid password key. Default password is "gmgn2026".');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">
              {targetMode === 'LIVE' ? 'Unlock Live Trading Mode' : 'Switch to Shadow Mode'}
            </h3>
            <p className="text-xs text-slate-400">
              {targetMode === 'LIVE'
                ? 'Authorization required to submit real Solana RPC transactions'
                : 'Return safely to simulated paper trading mode'}
            </p>
          </div>
        </div>

        {targetMode === 'LIVE' && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 space-y-2 text-xs text-amber-200">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>LIVE TRADING SAFETY WARNING</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              In Live Mode, all quick buys, sniper triggers, and market orders execute actual transactions on the Solana network using connected wallet keypairs. Slippage and gas fees apply.
            </p>
            <label className="flex items-center gap-2 cursor-pointer pt-1 text-[11px] text-amber-300 font-semibold">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="rounded border-amber-700 text-amber-500 focus:ring-amber-500/20"
              />
              <span>I accept live transaction risks and RPC execution speed</span>
            </label>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Security Password Key</span>
              <span className="text-[10px] text-slate-500 font-mono">(Default: gmgn2026)</span>
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs font-semibold text-red-400 bg-red-950/50 p-2.5 rounded-xl border border-red-800/60">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all ${
                targetMode === 'LIVE'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{targetMode === 'LIVE' ? 'Enable LIVE Execution' : 'Enable SHADOW Mode'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
