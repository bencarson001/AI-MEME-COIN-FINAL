import React, { useState, useEffect } from 'react';
import { 
  AiSkill, 
  SkillMatchResult, 
  AgentExecutionLog, 
  SiteAppearanceConfig, 
  SiteThemeStyle,
  SkillCategory 
} from '../types';
import { 
  Sparkles, 
  Search, 
  Download, 
  CheckCircle2, 
  Terminal, 
  Palette, 
  Flame, 
  PieChart, 
  Zap, 
  Crosshair, 
  ShieldCheck, 
  TrendingUp, 
  MessageSquare, 
  Lock, 
  Eye, 
  Code, 
  Cpu, 
  ExternalLink,
  Layers,
  Check,
  Play,
  RotateCcw,
  Sliders,
  AlertCircle
} from 'lucide-react';

interface SkillsHubTabProps {
  siteAppearance: SiteAppearanceConfig;
  onUpdateSiteAppearance: (newConfig: Partial<SiteAppearanceConfig>) => void;
  onRefreshWalletState: () => void;
}

export const SkillsHubTab: React.FC<SkillsHubTabProps> = ({
  siteAppearance,
  onUpdateSiteAppearance,
  onRefreshWalletState
}) => {
  const [prompt, setPrompt] = useState('');
  const [skillsCatalog, setSkillsCatalog] = useState<AiSkill[]>([]);
  const [installedSkillIds, setInstalledSkillIds] = useState<string[]>([]);
  const [repositoryUrl, setRepositoryUrl] = useState('https://github.com/sickn33/agentic-awesome-skills.git');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Match & Execution State
  const [isMatching, setIsMatching] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [matchResult, setMatchResult] = useState<SkillMatchResult | null>(null);
  const [executionLog, setExecutionLog] = useState<AgentExecutionLog | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Fetch Catalog on Mount
  const fetchCatalog = async () => {
    try {
      const res = await fetch('/api/skills/catalog');
      const json = await res.json();
      if (json.catalog) setSkillsCatalog(json.catalog);
      if (json.installedIds) setInstalledSkillIds(json.installedIds);
      if (json.repository) setRepositoryUrl(json.repository);
    } catch (err) {
      console.error('Failed to fetch skills catalog:', err);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // Quick prompt sample selector
  const handleQuickPrompt = (text: string) => {
    setPrompt(text);
    handleMatchAndInstall(text);
  };

  // Match Prompt to Best Skill & Install On Demand
  const handleMatchAndInstall = async (promptText?: string) => {
    const targetPrompt = promptText || prompt;
    if (!targetPrompt.trim()) return;

    setIsMatching(true);
    setMatchResult(null);
    setActionFeedback(null);

    try {
      const res = await fetch('/api/skills/match-and-install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: targetPrompt }),
      });
      const json = await res.json();

      if (!res.ok) {
        alert(`Skill Matching Failed: ${json.error || 'Unknown error'}`);
        return;
      }

      setMatchResult(json);
      await fetchCatalog();
    } catch (err) {
      console.error('Skill match error:', err);
    } finally {
      setIsMatching(false);
    }
  };

  // Execute Matched AI Agent
  const handleRunAgent = async () => {
    if (!matchResult) return;

    setIsExecuting(true);
    try {
      const res = await fetch('/api/skills/execute-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId: matchResult.matchedSkill.id,
          prompt: prompt || 'Execute agent task',
          actionType: matchResult.suggestedAction.type,
          payload: matchResult.suggestedAction.payload,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        alert(`Agent Execution Failed: ${json.error || 'Unknown error'}`);
        return;
      }

      if (json.log) {
        setExecutionLog(json.log);
      }

      if (json.siteAppearanceConfig) {
        onUpdateSiteAppearance(json.siteAppearanceConfig);
      }

      setActionFeedback(json.log?.resultSummary || 'Agent execution completed successfully!');
      onRefreshWalletState();
    } catch (err) {
      console.error('Error executing agent:', err);
      alert('Error connecting to AI Agent execution server');
    } finally {
      setIsExecuting(false);
    }
  };

  // Toggle Install Skill manually
  const handleToggleInstall = async (skillId: string, currentInstalled: boolean) => {
    try {
      const endpoint = currentInstalled ? '/api/skills/uninstall' : '/api/skills/install';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId }),
      });
      if (res.ok) {
        await fetchCatalog();
      }
    } catch (err) {
      console.error('Error toggling skill installation:', err);
    }
  };

  // Helper Icon Renderer
  const renderSkillIcon = (iconName: string) => {
    switch (iconName) {
      case 'PieChart': return <PieChart className="w-5 h-5 text-cyan-400" />;
      case 'Flame': return <Flame className="w-5 h-5 text-amber-400" />;
      case 'Zap': return <Zap className="w-5 h-5 text-emerald-400" />;
      case 'Palette': return <Palette className="w-5 h-5 text-purple-400" />;
      case 'Crosshair': return <Crosshair className="w-5 h-5 text-red-400" />;
      case 'ShieldCheck': return <ShieldCheck className="w-5 h-5 text-teal-400" />;
      case 'TrendingUp': return <TrendingUp className="w-5 h-5 text-emerald-300" />;
      case 'MessageSquare': return <MessageSquare className="w-5 h-5 text-blue-400" />;
      case 'Lock': return <Lock className="w-5 h-5 text-amber-300" />;
      case 'Eye': return <Eye className="w-5 h-5 text-indigo-400" />;
      default: return <Cpu className="w-5 h-5 text-emerald-400" />;
    }
  };

  // Filter skills by category
  const filteredSkills = selectedCategory === 'ALL'
    ? skillsCatalog
    : skillsCatalog.filter(s => s.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Top Banner: On-Demand Skill Engine Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-48 h-48 text-emerald-400" />
        </div>

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              ON-DEMAND AI SKILLS HUB
            </span>
            <a 
              href={repositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono text-slate-400 hover:text-emerald-300 flex items-center gap-1 transition-colors bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800"
            >
              <Code className="w-3.5 h-3.5 text-cyan-400" />
              <span>sickn33/agentic-awesome-skills</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
              Installed: <strong className="text-emerald-400">{installedSkillIds.length}</strong> / {skillsCatalog.length} Skills
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Natural Language Skill Agent Selector
            </h1>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">
              Type any request in plain English. The GMGN AI engine will automatically search the Agentic Awesome Skills repository, select the single best skill, install it on-demand, and execute agentic site changes, trader updates, or on-chain analysis!
            </p>
          </div>

          {/* Prompt Input Box */}
          <div className="space-y-3 pt-2">
            <div className="relative">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMatchAndInstall()}
                placeholder="e.g., 'Change site theme to Cyberpunk Neon Gold', 'Check top holder distribution for NEURAL', 'Tune sniper filters for strict risk'..."
                className="w-full bg-slate-950/90 border-2 border-emerald-500/40 focus:border-emerald-400 rounded-xl px-4 py-3.5 pl-11 pr-36 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium shadow-inner transition-all"
              />
              <Search className="w-5 h-5 text-emerald-400 absolute left-3.5 top-4" />
              <button
                onClick={() => handleMatchAndInstall()}
                disabled={isMatching || !prompt.trim()}
                className="absolute right-2 top-2 bottom-2 px-4 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md"
              >
                {isMatching ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Matching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Find & Install</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Prompt Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-400 font-medium">Quick Prompts:</span>
              <button
                onClick={() => handleQuickPrompt("Change site theme to Cyberpunk Neon Gold")}
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[11px] font-medium transition-all"
              >
                🎨 Cyberpunk Neon Gold Theme
              </button>
              <button
                onClick={() => handleQuickPrompt("Analyze holder distribution and insider bundles for NEURAL")}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-[11px] font-medium transition-all"
              >
                🐳 Check Holder Distribution
              </button>
              <button
                onClick={() => handleQuickPrompt("Launch a new meme coin named CyberAI on Pump.fun")}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-[11px] font-medium transition-all"
              >
                🚀 Pump.fun Coin Launcher
              </button>
              <button
                onClick={() => handleQuickPrompt("Tune sniper bot filters to only buy tokens with >80% buy pressure and 0% dev holding")}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium transition-all"
              >
                🎯 Strict Sniper Bot Rules
              </button>
              <button
                onClick={() => handleQuickPrompt("Enable maximum Jito anti-MEV protection for all quick trades")}
                className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-[11px] font-medium transition-all"
              >
                🛡️ Enable Anti-MEV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Match Result Card (Shown when a prompt is matched) */}
      {matchResult && (
        <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                {renderSkillIcon(matchResult.matchedSkill.iconName)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    {matchResult.matchedSkill.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                    {matchResult.confidenceScore}% CONFIDENCE MATCH
                  </span>
                  {matchResult.wasInstalledOnDemand ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30 flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      INSTALLED ON-DEMAND
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      SKILL ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Path: <code className="text-slate-300 font-mono">{matchResult.matchedSkill.installPath}</code>
                </p>
              </div>
            </div>

            <button
              onClick={handleRunAgent}
              disabled={isExecuting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
            >
              {isExecuting ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>EXECUTING AGENT...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>RUN AGENT & APPLY CHANGES</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Match Reason & Action Summary */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Skill Match Analysis</span>
              <p className="text-slate-200 leading-relaxed font-medium">
                {matchResult.matchReason}
              </p>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Target Action Type:</span>
                <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  {matchResult.suggestedAction.type}
                </span>
              </div>
            </div>

            {/* AI Agent Execution Steps */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Agent Plan</span>
              <ul className="space-y-1.5 text-slate-300 font-mono text-[11px]">
                {matchResult.agentPlan.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">›</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Execution Feedback Banner */}
      {actionFeedback && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-4 flex items-center justify-between gap-3 text-emerald-200 text-xs shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{actionFeedback}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-emerald-400 hover:text-white text-xs font-mono font-bold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Live AI Agent Execution Terminal Logs (if available) */}
      {executionLog && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-slate-200">
                AGENT EXECUTION LOG: {executionLog.agentName}
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              STATUS: {executionLog.status}
            </span>
          </div>

          <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 space-y-1 max-h-60 overflow-y-auto">
            {executionLog.stdoutLogs.map((log, i) => (
              <div key={i} className="text-slate-300">
                <span className="text-emerald-500 font-bold">❯ </span>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Theme Control Panel */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Application Theme & Visual Styler Controls</h3>
          </div>
          <span className="text-xs text-slate-400">Current Theme: <strong className="text-emerald-400">{siteAppearance.themeStyle}</strong></span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => onUpdateSiteAppearance({ themeStyle: 'EMERALD_PRO', accentColor: '#10b981' })}
            className={`p-3 rounded-xl border text-left transition-all ${
              siteAppearance.themeStyle === 'EMERALD_PRO'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-emerald-500 mb-2 shadow-sm" />
            <div className="text-xs font-bold">Emerald Pro</div>
            <div className="text-[10px] text-slate-400">Default dark trading UI</div>
          </button>

          <button
            onClick={() => onUpdateSiteAppearance({ themeStyle: 'CYBERPUNK_NEON', accentColor: '#f59e0b' })}
            className={`p-3 rounded-xl border text-left transition-all ${
              siteAppearance.themeStyle === 'CYBERPUNK_NEON'
                ? 'bg-amber-950/80 border-amber-500 text-amber-200 ring-2 ring-amber-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-amber-400 mb-2 shadow-sm" />
            <div className="text-xs font-bold">Cyberpunk Gold</div>
            <div className="text-[10px] text-slate-400">High-energy neon yellow</div>
          </button>

          <button
            onClick={() => onUpdateSiteAppearance({ themeStyle: 'MIDNIGHT_GOLD', accentColor: '#eab308' })}
            className={`p-3 rounded-xl border text-left transition-all ${
              siteAppearance.themeStyle === 'MIDNIGHT_GOLD'
                ? 'bg-yellow-950/80 border-yellow-500 text-yellow-200 ring-2 ring-yellow-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-yellow-500 mb-2 shadow-sm" />
            <div className="text-xs font-bold">Midnight Gold</div>
            <div className="text-[10px] text-slate-400">Luxury gold & obsidian</div>
          </button>

          <button
            onClick={() => onUpdateSiteAppearance({ themeStyle: 'TERMINAL_HIGH_CONTRAST', accentColor: '#22c55e' })}
            className={`p-3 rounded-xl border text-left transition-all ${
              siteAppearance.themeStyle === 'TERMINAL_HIGH_CONTRAST'
                ? 'bg-green-950/80 border-green-500 text-green-200 ring-2 ring-green-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-green-500 mb-2 shadow-sm" />
            <div className="text-xs font-bold">Terminal Green</div>
            <div className="text-[10px] text-slate-400">Monochrome high contrast</div>
          </button>

          <button
            onClick={() => onUpdateSiteAppearance({ themeStyle: 'AMETHYST_DARK', accentColor: '#a855f7' })}
            className={`p-3 rounded-xl border text-left transition-all ${
              siteAppearance.themeStyle === 'AMETHYST_DARK'
                ? 'bg-purple-950/80 border-purple-500 text-purple-200 ring-2 ring-purple-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-purple-500 mb-2 shadow-sm" />
            <div className="text-xs font-bold">Amethyst Velvet</div>
            <div className="text-[10px] text-slate-400">Deep purple twilight</div>
          </button>
        </div>
      </div>

      {/* Skill Catalog Registry Grid */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Agentic Awesome Skills Catalog
            </h2>
            <p className="text-xs text-slate-400">
              Browse available skills from <code className="text-emerald-400">{repositoryUrl}</code>
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {['ALL', 'GMGN_TRADING', 'ONCHAIN_ANALYSIS', 'SITE_CUSTOMIZATION', 'SNIPER_BOT', 'SECURITY'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Skills Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSkills.map(skill => {
            const isInstalled = installedSkillIds.includes(skill.id);
            return (
              <div 
                key={skill.id}
                className={`bg-slate-900/90 border rounded-2xl p-5 space-y-4 transition-all hover:border-slate-700 shadow-xl relative overflow-hidden ${
                  isInstalled ? 'border-emerald-500/40 bg-slate-900' : 'border-slate-800/80'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                      {renderSkillIcon(skill.iconName)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {skill.name}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400">
                        {skill.category} • v{skill.version}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleInstall(skill.id, isInstalled)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                      isInstalled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-red-950/40 hover:text-red-300 hover:border-red-800'
                        : 'bg-slate-800 hover:bg-emerald-500 text-slate-200 hover:text-slate-950 border-slate-700'
                    }`}
                  >
                    {isInstalled ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Installed</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Install On-Demand</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {skill.description}
                </p>

                {/* Agent Capabilities Badges */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agent Capabilities:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {skill.agentCapabilities.map((cap, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 text-[10px]">
                        ✓ {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Sample Prompt Trigger Button */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">CLI: {skill.cliCommand || 'npx skill'}</span>
                  <button
                    onClick={() => handleQuickPrompt(skill.samplePrompts[0])}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                  >
                    <span>Use Sample Prompt</span>
                    <Sparkles className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
