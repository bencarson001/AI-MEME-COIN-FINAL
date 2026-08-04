import React, { useState, useEffect, useRef } from 'react';
import { ExecutionMode, SiteAppearanceConfig } from '../types';
import { 
  Terminal, 
  Copy, 
  Check, 
  Trash2, 
  ExternalLink,
  Play,
  RotateCcw,
  Sparkles,
  Key
} from 'lucide-react';

interface AiAgentTabProps {
  executionMode: ExecutionMode;
  siteAppearance: SiteAppearanceConfig;
  onUpdateSiteAppearance: (newConfig: Partial<SiteAppearanceConfig>) => void;
  onRefreshWalletState: () => void;
}

interface TerminalLogEntry {
  id: string;
  cmd: string;
  output: string;
  cwd: string;
  timestamp: string;
  isError?: boolean;
}

export const AiAgentTab: React.FC<AiAgentTabProps> = () => {
  const defaultCwd = '~/app';
  const [currentCwd, setCurrentCwd] = useState(defaultCwd);
  const [terminalLogs, setTerminalLogs] = useState<TerminalLogEntry[]>([]);
  const [cmdInput, setCmdInput] = useState('');
  const [isTerminalLoading, setIsTerminalLoading] = useState(false);
  const [copiedTerminal, setCopiedTerminal] = useState(false);
  
  const [cmdHistory, setCmdHistory] = useState<string[]>([
    'gmgn-cli config',
    'python3 app.py status',
    'gmgn-cli'
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    executeTerminalCommand('gmgn-cli config', defaultCwd);
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs, cmdInput]);

  const executeTerminalCommand = async (cmdStr: string, cwdToUse = currentCwd) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    setIsTerminalLoading(true);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (trimmed.toLowerCase() === 'clear' || trimmed.toLowerCase() === 'cls') {
      setTerminalLogs([]);
      setIsTerminalLoading(false);
      setCmdInput('');
      return;
    }

    let targetCwd = cwdToUse;
    if (trimmed.toLowerCase().startsWith('cd ')) {
      const newPath = trimmed.substring(3).trim();
      if (newPath) {
        targetCwd = newPath;
        setCurrentCwd(newPath);
      }
    }

    try {
      setCmdHistory(prev => [...prev.filter(c => c !== trimmed), trimmed]);
      setHistoryIndex(-1);

      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: trimmed,
          cwd: targetCwd === '~/app' ? undefined : targetCwd
        })
      });

      const json = await res.json();
      if (json.cwd && targetCwd !== '~/app') {
        setCurrentCwd(json.cwd);
      }

      const stdout = json.stdout || '';
      const stderr = json.stderr || '';
      const combined = stdout + (stderr ? (stdout ? '\n' + stderr : stderr) : '');

      setTerminalLogs(prev => [
        ...prev,
        {
          id: 'log-' + Date.now() + '-' + Math.random(),
          cmd: trimmed,
          output: combined || (json.exitCode === 0 ? 'Command completed.' : `Exit code: ${json.exitCode}`),
          cwd: targetCwd,
          timestamp: time,
          isError: json.exitCode !== 0
        }
      ]);
    } catch (err) {
      setTerminalLogs(prev => [
        ...prev,
        {
          id: 'log-' + Date.now() + '-' + Math.random(),
          cmd: trimmed,
          output: `Execution error: ${err}`,
          cwd: targetCwd,
          timestamp: time,
          isError: true
        }
      ]);
    } finally {
      setIsTerminalLoading(false);
      setCmdInput('');
    }
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeTerminalCommand(cmdInput);
  };

  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIndex = historyIndex === -1 ? cmdHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCmdInput(cmdHistory[nextIndex] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= cmdHistory.length) {
        setHistoryIndex(-1);
        setCmdInput('');
      } else {
        setHistoryIndex(nextIndex);
        setCmdInput(cmdHistory[nextIndex] || '');
      }
    }
  };

  const handleTerminalClick = () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) {
      terminalInputRef.current?.focus();
    }
  };

  const renderFormattedOutput = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, idx) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={idx}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 break-all font-semibold inline-flex items-center gap-1.5 my-1.5 p-2 bg-slate-900/90 rounded border border-cyan-500/40 hover:border-cyan-400 transition-all shadow-md group"
          >
            <Key className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>{part}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
          </a>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="bg-[#0C0C0C] rounded-xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col font-mono text-xs min-h-[500px]">
        
        <div className="bg-[#181818] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>

            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-slate-200 text-xs tracking-tight">Terminal Console — GMGN-CLI Agent</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#0A0A0A] text-emerald-400 border border-emerald-500/30 font-bold ml-1">
                {currentCwd}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const text = terminalLogs.map(l => `${l.cwd}> ${l.cmd}\n${l.output}`).join('\n\n');
                navigator.clipboard.writeText(text);
                setCopiedTerminal(true);
                setTimeout(() => setCopiedTerminal(false), 2000);
              }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1.5 transition-all"
            >
              {copiedTerminal ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedTerminal ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={() => setTerminalLogs([])}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-red-950/80 text-slate-300 hover:text-red-300 text-[11px] flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        <div className="bg-[#121212] px-4 py-2 border-b border-slate-800 flex items-center gap-2.5 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-bold text-[10px] uppercase shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" /> Run:
          </span>

          <button
            onClick={() => executeTerminalCommand('gmgn-cli config')}
            disabled={isTerminalLoading}
            className="px-3 py-1 rounded bg-[#1C1C1C] hover:bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 hover:border-emerald-400 font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
          >
            <Play className="w-3 h-3 fill-current text-emerald-400" />
            <span>gmgn-cli config</span>
          </button>

          <button
            onClick={() => executeTerminalCommand('python3 app.py status')}
            disabled={isTerminalLoading}
            className="px-3 py-1 rounded bg-[#1C1C1C] hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold transition-all shrink-0"
          >
            python3 app.py status
          </button>

          <button
            onClick={() => executeTerminalCommand('python3 app.py market')}
            disabled={isTerminalLoading}
            className="px-3 py-1 rounded bg-[#1C1C1C] hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold transition-all shrink-0"
          >
            python3 app.py market
          </button>

          <button
            onClick={() => {
              setTerminalLogs([]);
              executeTerminalCommand('gmgn-cli config', defaultCwd);
            }}
            className="px-3 py-1 rounded bg-[#1C1C1C] hover:bg-amber-950/60 text-amber-300 border border-slate-700 font-bold transition-all shrink-0 ml-auto flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Console</span>
          </button>
        </div>

        <div 
          onClick={handleTerminalClick}
          className="p-5 bg-[#0C0C0C] font-mono text-xs text-slate-100 flex-1 min-h-[400px] overflow-y-auto space-y-4 cursor-text selection:bg-slate-800 selection:text-white"
        >
          <div className="text-slate-400 leading-relaxed font-mono border-b border-slate-900 pb-3">
            GMGN AI Terminal Shell [v3.2.0]<br />
            Workspace Root: <span className="text-emerald-400 font-bold">{currentCwd}</span><br />
            Type commands directly at the prompt below (or use <kbd className="px-1 rounded bg-slate-800 text-slate-300 text-[10px]">↑</kbd> <kbd className="px-1 rounded bg-slate-800 text-slate-300 text-[10px]">↓</kbd> for command history).
          </div>

          {terminalLogs.map(log => (
            <div key={log.id} className="space-y-1.5 font-mono">
              <div className="flex items-center gap-1.5 text-slate-200">
                <span className="font-bold text-emerald-400">{log.cwd}$</span>
                <span className="text-white font-bold">{log.cmd}</span>
                <span className="text-[10px] text-slate-600 ml-auto">{log.timestamp}</span>
              </div>
              {log.output && (
                <div className={`whitespace-pre-wrap font-mono p-1 rounded text-xs leading-relaxed ${
                  log.isError ? 'text-red-400' : 'text-slate-100'
                }`}>
                  {renderFormattedOutput(log.output)}
                </div>
              )}
            </div>
          ))}

          <form onSubmit={handleTerminalSubmit} className="flex items-center gap-1.5 pt-1 font-mono">
            <span className="text-emerald-400 font-bold shrink-0">{currentCwd}$</span>
            <input
              ref={terminalInputRef}
              type="text"
              value={cmdInput}
              onChange={(e) => setCmdInput(e.target.value)}
              onKeyDown={handleTerminalKeyDown}
              placeholder="Type command (e.g. 'gmgn-cli config') and press Enter..."
              autoFocus
              className="flex-1 bg-transparent text-white focus:outline-none font-mono text-xs caret-emerald-400"
            />
            {isTerminalLoading ? (
              <span className="text-emerald-400 animate-pulse text-[10px] font-bold">Executing...</span>
            ) : (
              <span className="w-2.5 h-4 bg-emerald-400 animate-pulse inline-block shrink-0" />
            )}
          </form>

          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};
