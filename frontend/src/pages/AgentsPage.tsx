import { Sparkles, Zap, BarChart2, Newspaper, Landmark, Globe, Network } from 'lucide-react'

const AGENTS = [
  { key: 'FullGraph', label: 'Auto (All Agents)', icon: Sparkles, desc: 'Runs all 6 agents in full graph mode. Intelligently routes your query to the relevant sub-agents, aggregates their insights, and provides a comprehensive synthesized report.' },
  { key: 'FlowSentinel', label: 'FlowSentinel', icon: Zap, desc: 'ETF & institutional flow analyzer. Monitors on-chain fund movements, ETF inflows/outflows, and large institutional wallet activity to detect early liquidity trends.' },
  { key: 'NarrativeScope', label: 'NarrativeScope', icon: Newspaper, desc: 'Sentiment & news intelligence. Scans social media, news outlets, and crypto-native forums to quantify market sentiment and identify emerging narratives.' },
  { key: 'TreasuryRadar', label: 'TreasuryRadar', icon: Landmark, desc: 'Corporate BTC accumulation tracker. Keeps tabs on public company treasuries, microstrategy purchases, and sovereign nation accumulation patterns.' },
  { key: 'IndexArb', label: 'IndexArb', icon: BarChart2, desc: 'Relative value scanner. Identifies pricing inefficiencies and arbitrage opportunities across different crypto indices, pairs, and exchanges.' },
  { key: 'MacroShield', label: 'MacroShield', icon: Globe, desc: 'Macro event risk modeler. Correlates traditional macroeconomic indicators (CPI, interest rates, DXY) with crypto market volatility to assess systemic risk.' },
  { key: 'VentureMap', label: 'VentureMap', icon: Network, desc: 'Fundraising & VC intelligence. Tracks private funding rounds, token unlocks, and venture capital movement to predict ecosystem growth and sell pressure.' },
]

export function AgentsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-medium text-white tracking-tight">Kageyomi Agents</h1>
      <p className="text-sm text-zinc-500 mb-8">Our specialized AI agents run securely within Fhenix enclaves.</p>

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
