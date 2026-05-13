import { Search, ChevronRight, Lock, MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'

const MOCK_HISTORY = [
  { id: '1', title: 'BTC ETF flows vs CPI impact', date: 'Today, 10:23 AM', agent: 'MacroShield', preview: 'The correlation between recent ETF inflows and...' },
  { id: '2', title: 'MSTR accumulation pattern', date: 'Yesterday, 04:15 PM', agent: 'TreasuryRadar', preview: 'Analyzing MicroStrategy\'s recent $500M convertible...' },
  { id: '3', title: 'Solana ecosystem venture funding', date: 'May 10, 2026', agent: 'VentureMap', preview: 'Recent Series A rounds in the Solana DePIN sector...' },
  { id: '4', title: 'Relative value: ETH vs BTC', date: 'May 08, 2026', agent: 'IndexArb', preview: 'The ETH/BTC ratio has reached a key support level...' },
]

export function HistoryPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-medium text-white tracking-tight">Research History</h1>
          <p className="text-sm text-zinc-500 mt-2">Past market briefs, agent verdicts, and privately decrypted outputs.</p>
        </div>
        <Link to="/inference/new" className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors">
          <Search className="w-4 h-4" />
          New Research Run
        </Link>
      </div>
      
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        {MOCK_HISTORY.map((item, i) => (
          <div key={item.id} className={`p-4 flex items-center gap-4 hover:bg-zinc-800/50 transition-colors cursor-pointer ${i !== 0 ? 'border-t border-zinc-800' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-white truncate">{item.title}</h3>
                <span className="flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                  <Lock className="w-3 h-3" /> PRIVATE
                </span>
              </div>
              <p className="text-xs text-zinc-500 truncate">{item.preview}</p>
            </div>
            <div className="text-right shrink-0 hidden sm:block">
              <div className="text-xs text-zinc-400 mb-1">{item.date}</div>
              <div className="text-[10px] text-zinc-600 font-mono">{item.agent}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
