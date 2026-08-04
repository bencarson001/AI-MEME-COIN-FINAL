import React, { useState, useEffect, useRef } from 'react';
import { ExecutionMode } from '../types';
import { 
  Terminal, 
  Send, 
  Copy, 
  Check, 
  Trash2, 
  RefreshCw, 
  CornerDownLeft,
  Folder,
  Code2,
  Sparkles
} from 'lucide-react';

interface SettingsTabProps {
  executionMode: ExecutionMode;
}

interface TerminalHistoryEntry {
  id: string;
  command: string;
  output: string;
  error?: string;
  timestamp: string;
  cwd: string;
  type?: 'success' | 'error' | 'info' | 'system';
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ executionMode }) => {
  const [terminalHistory, setTerminalHistory] = useState<TerminalHistoryEntry[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [currentCwd, setCurrentCwd] = useState<string>('');
  const [cmdHistoryIndex, setCmdHistoryIndex] = useState<number>(-1);
  const [pastCmds, setPastCmds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [terminalHistory]);

  // Initial welcome message & initial pwd/config run
  useEffect(() => {
    executeCommand('pwd', true);
    executeCommand('gmgn-cli config', false);
  }, []);

  const executeCommand = async (cmdString: string, isInitialPwd = false) => {
    const trimmed = cmdString.trim();
    if (!trimmed && !isInitialPwd) return;

    setIsLoading(true);
    const time = new Date().toLocaleTimeString();

    if (trimmed && !pastCmds.includes(trimmed)) {
      setPastCmds(prev => [trimmed, ...prev]);
    }
    setCmdHistoryIndex(-1);

    const lower = trimmed.toLowerCase();

    // Handle 'clear' command directly
    if (lower === 'clear' || lower === 'cls') {
      setTerminalHistory([]);
      setIsLoading(false);
      setInputVal('');
      return;
    }

    try {
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: trimmed || 'pwd',
          cwd: currentCwd
        })
      });

      const json = await res.json();
      if (json.cwd) {
        setCurrentCwd(json.cwd);
      }

      if (isInitialPwd) {
        setIsLoading(false);
        setInputVal('');
        return;
      }

      const stdout = json.stdout || '';
      const stderr = json.stderr || '';
      const combinedOutput = stdout + (stderr ? (stdout ? '\n' + stderr : stderr) : '');

      setTerminalHistory(prev => [
        ...prev,
        {
          id: 'cmd-' + Date.now() + '-' + Math.random(),
          command: trimmed,
          output: combinedOutput || (json.exitCode === 0 ? '(command executed with no output)' : `Exit code: ${json.exitCode}`),
          error: stderr ? stderr : undefined,
          timestamp: time,
          cwd: json.cwd || currentCwd,
          type: json.exitCode === 0 ? (stderr ? 'info' : 'success') : 'error'
        }
      ]);
    } catch (err) {
      setTerminalHistory(prev => [
        ...prev,
        {
          id: 'cmd-' + Date.now() + '-' + Math.random(),
          command: trimmed,
          output: `Failed to execute command: ${err}`,
          timestamp: time,
          cwd: currentCwd,
          type: 'error'
        }
      ]);
    } finally {
      setIsLoading(false);
      setInputVal('');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(inputVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (pastCmds.length > 0 && cmdHistoryIndex < pastCmds.length - 1) {
        const nextIdx = cmdHistoryIndex + 1;
        setCmdHistoryIndex(nextIdx);
        setInputVal(pastCmds[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdHistoryIndex > 0) {
        const nextIdx = cmdHistoryIndex - 1;
        setCmdHistoryIndex(nextIdx);
        setInputVal(pastCmds[nextIdx]);
      } else if (cmdHistoryIndex === 0) {
        setCmdHistoryIndex(-1);
        setInputVal('');
      }
    }
  };

  const handleCopyAllLogs = () => {
    const fullText = terminalHistory
      .map(entry => `[${entry.cwd}] $ ${entry.command}\n${entry.output}`)
      .join('\n\n----------------------------------------\n\n');
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleClearTerminal = () => {
    setTerminalHistory([]);
  };

  // Focus input on console click only if user is NOT highlighting/selecting text
  const handleTerminalAreaClick = () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) {
      inputRef.current?.focus();
    }
  };

  const displayCwd = currentCwd ? currentCwd.replace(/.*\/workspace/, '~') : '~';

  return (
    <div className="max-w-7xl mx-auto space-y-4 font-mono text-xs">
      {/* Sleek macOS Style Interactive Shell Terminal */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800/90 shadow-2xl overflow-hidden flex flex-col min-h-[640px] max-h-[82vh]">
        {/* Terminal Header Bar */}
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between select-none shrink-0">
          {/* Left: Window Controls & Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block border border-red-600/50" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block border border-amber-600/50" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block border border-emerald-600/50" />
            </div>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-200 tracking-tight">App Filesystem Shell Terminal</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700 font-bold flex items-center gap-1">
                <Folder className="w-3 h-3" />
                {displayCwd}
              </span>
            </div>
          </div>

          {/* Right Controls: Quick Actions & Status */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/30 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>SHELL READY ({executionMode})</span>
            </div>

            <button
              onClick={handleCopyAllLogs}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] flex items-center gap-1 transition-colors"
              title="Copy All Console Output"
            >
              {copiedAll ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedAll ? 'Copied' : 'Copy Output'}</span>
            </button>

            <button
              onClick={handleClearTerminal}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-400 border border-slate-700 hover:border-red-500/40 text-[11px] flex items-center gap-1 transition-colors"
              title="Clear Console Buffer"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        {/* Quick Command Suggestions Bar */}
        <div className="bg-slate-900/60 px-4 py-2 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold shrink-0">Quick Commands:</span>
          
          <button
            onClick={() => executeCommand('npx skills add GMGNAI/gmgn-skills')}
            disabled={isLoading}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-emerald-950/60 text-emerald-400 hover:border-emerald-500/50 border border-slate-800 text-[11px] font-bold transition-all shrink-0 flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>npx skills add GMGNAI/gmgn-skills</span>
          </button>

          <button
            onClick={() => executeCommand('npx skills list')}
            disabled={isLoading}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-indigo-950/60 text-indigo-300 hover:border-indigo-500/50 border border-slate-800 text-[11px] font-bold transition-all shrink-0 flex items-center gap-1"
          >
            <Code2 className="w-3 h-3 text-indigo-400" />
            <span>npx skills list</span>
          </button>

          <button
            onClick={() => executeCommand('gmgn-cli config')}
            disabled={isLoading}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-amber-950/60 text-amber-300 hover:border-amber-500/50 border border-slate-800 text-[11px] font-bold transition-all shrink-0 flex items-center gap-1"
          >
            <span>gmgn-cli config</span>
          </button>

          <button
            onClick={() => executeCommand('ls -la')}
            disabled={isLoading}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-bold transition-all shrink-0 flex items-center gap-1"
          >
            <span>ls -la</span>
          </button>
        </div>

        {/* Main Terminal Buffer Screen - Allows full mouse text selection & copy/paste */}
        <div 
          onClick={handleTerminalAreaClick}
          className="flex-1 p-5 overflow-y-auto space-y-6 font-mono text-xs leading-relaxed selection:bg-emerald-500/40 selection:text-white cursor-text select-text"
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
        >
          {terminalHistory.length === 0 ? (
            <div className="text-slate-600 italic py-8 text-center select-text">
              Terminal screen cleared. Type any command (e.g. <span className="text-emerald-400">ls</span>, <span className="text-emerald-400">pwd</span>, <span className="text-emerald-400">gmgn-cli config</span>, <span className="text-emerald-400">npx skills list</span>) to execute in app filesystem path.
            </div>
          ) : (
            terminalHistory.map((entry) => (
              <div key={entry.id} className="space-y-1.5 select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                {/* Command Prompt Line */}
                <div className="flex items-center gap-2 text-slate-400 font-bold select-text">
                  <span className="text-emerald-400 select-none">applet:{displayCwd}$</span>
                  <span className="text-white font-mono">{entry.command}</span>
                  <span className="text-[10px] text-slate-600 ml-auto select-none">{entry.timestamp}</span>
                </div>

                {/* Command Output Block with Full Text Highlighting & Copy Ability */}
                <div className={`pl-3 border-l-2 py-1 font-mono select-text ${
                  entry.type === 'error'
                    ? 'border-red-500 text-red-300 bg-red-950/20 rounded-r-lg px-3'
                    : entry.type === 'success'
                    ? 'border-emerald-500/80 text-emerald-300 bg-slate-900/60 rounded-r-lg px-3'
                    : 'border-slate-800 text-slate-300'
                }`} style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                  <pre className="whitespace-pre-wrap font-mono leading-relaxed select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                    {entry.output}
                  </pre>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-emerald-400 py-2 select-none">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="animate-pulse font-bold">Executing command in shell...</span>
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>

        {/* Terminal Interactive Input Line */}
        <form 
          onSubmit={handleFormSubmit}
          className="bg-slate-900/90 border-t border-slate-800 p-3 flex items-center gap-2 shrink-0 select-text"
        >
          <span className="text-emerald-400 font-bold text-xs select-none pl-1 shrink-0">
            {displayCwd}$
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type shell command e.g. npx skills list, ls -la, gmgn-cli config, cd src..."
            className="flex-1 bg-transparent border-none text-xs text-white font-mono focus:outline-none focus:ring-0 placeholder:text-slate-600 select-text"
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 shrink-0"
          >
            <span>Run</span>
            <CornerDownLeft className="w-3 h-3" />
          </button>
        </form>
      </div>
    </div>
  );
};
