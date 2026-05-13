import { Sparkles, Zap, BarChart2, Newspaper, Landmark, Globe, Network } from 'lucide-react'

const AGENTS = [
  { key: 'FullGraph', label: 'Auto Router', icon: Sparkles, desc: 'Routes the brief to the most relevant specialists, then hands the evidence set to StrategyForge for a final cross-signal thesis.' },
  { key: 'FlowSentinel', label: 'FlowSentinel', icon: Zap, desc: 'Tracks ETF flow momentum and institutional demand shifts from SoSoValue flow endpoints to spot liquidity pressure early.' },
  { key: 'NarrativeScope', label: 'NarrativeScope', icon: Newspaper, desc: 'Reads crypto news and narrative momentum to surface the stories currently shaping positioning and sentiment.' },
  { key: 'TreasuryRadar', label: 'TreasuryRadar', icon: Landmark, desc: 'Follows corporate bitcoin treasury behavior, headline accumulation, and balance-sheet conviction across public entities.' },
  { key: 'IndexArb', label: 'IndexArb', icon: BarChart2, desc: 'Scans SoSoValue index performance for leadership, weakness, and cross-sector rotation inside crypto beta.' },
  { key: 'MacroShield', label: 'MacroShield', icon: Globe, desc: 'Maps CPI, FOMC, payrolls, and macro surprise history into crypto risk so the thesis is not blind to broader market pressure.' },
  { key: 'VentureMap', label: 'VentureMap', icon: Network, desc: 'Tracks fundraising and venture activity to understand where capital is concentrating before it becomes a visible narrative.' },
]

export function AgentsPage() {
  return (
      <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-medium text-white tracking-tight">Kageyomi Agents</h1>
      <p className="text-sm text-zinc-500 mb-8">Six specialist crypto research agents plus synthesis, with Fhenix confidential inferencing protecting every brief, tool call, and result.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AGENTS.map((agent) => {
          const Icon = agent.icon;
          return (
            <div key={agent.key} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-zinc-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{agent.label}</h3>
                  <div className="text-xs text-zinc-500 font-mono">{agent.key}</div>
                </div>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed flex-1">
                {agent.desc}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
