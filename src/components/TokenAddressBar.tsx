import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface TokenAddressBarProps {
  address: string;
  chain?: string;
  className?: string;
  showLabels?: boolean;
}

export const TokenAddressBar: React.FC<TokenAddressBarProps> = ({
  address,
  chain = 'solana',
  className = '',
  showLabels = true,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const chainKey = chain === 'ethereum' ? 'eth' : chain === 'base' ? 'base' : chain === 'bsc' ? 'bsc' : 'sol';
  const dexChain = chain === 'solana' ? 'solana' : chain === 'ethereum' ? 'ethereum' : chain === 'bsc' ? 'bsc' : 'base';
  const dexscreenerUrl = `https://dexscreener.com/${dexChain}/${address}`;
  const gmgnUrl = `https://gmgn.ai/${chainKey}/token/${address}`;
  const trojanUrl = `https://trojan.com/terminal?token=${address}`;
  const chainDisplayName = chain.toUpperCase();

  return (
    <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800/90 font-mono text-xs space-y-2.5 ${className}`}>
      {/* 2. Full Token Contract Address (CA) Underneath DexScreener */}
      <div className="flex items-center justify-between gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
        <div className="flex-1 min-w-0">
          {showLabels && (
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-sans font-bold mb-0.5">
              Full {chainDisplayName} Contract Address (CA)
            </div>
          )}
          <div className="text-[11px] font-bold text-slate-200 break-all select-all font-mono leading-tight">
            {address}
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="shrink-0 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1 font-sans text-[11px] font-semibold"
          title="Copy Full Token Address"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy CA</span>
            </>
          )}
        </button>
      </div>

      {/* 3. External Links: GMGN.AI & Trojan.com */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 font-sans">
        <a
          href={gmgnUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-emerald-950/60 hover:border-emerald-500/50 text-emerald-400 border border-slate-800 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm group"
        >
          <span>View on GMGN.AI</span>
          <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>

        <a
          href={trojanUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-amber-950/60 hover:border-amber-500/50 text-amber-300 border border-slate-800 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm group"
        >
          <span>Trojan Bot</span>
          <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      </div>
    </div>
  );
};
