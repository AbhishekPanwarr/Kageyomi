import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity, Newspaper, Landmark, Lock, Network, BarChart2, TrendingUp
} from 'lucide-react';
import { useAccount } from 'wagmi';


const KAGEYOMI_AGENT_MODE = import.meta.env.VITE_KAGEYOMI_AGENT_MODE === 'true'

const EXECUTION_STEPS = [
  'Query Encrypted',
  'Agents Assigned',
  'Enclave Execution',
  'Quorum Verification',
  'On-Chain Commitment',
]

const ACTIVE_AGENTS = [
  { name: 'FlowSentinel', signal: '+$1.2B inflow (7d)', icon: Activity },
  { name: 'NarrativeScope', signal: '+0.76 bullish', icon: Newspaper },
  { name: 'TreasuryRadar', signal: 'MSTR: +3,015 BTC', icon: Landmark },
]

const QUICK_PROMPTS = [
  'BTC ETF flows vs CPI',
  'MSTR accumulation pattern',
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function HomePage() {
  const { address } = useAccount()

  if (!KAGEYOMI_AGENT_MODE) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-start w-full max-w-5xl mx-auto pt-24 pb-32 px-6">
        <div className="mb-6">
          <span className="text-zinc-500 font-mono text-[10px] tracking-[0.2em] uppercase">
            Build on Fhenix
          </span>
        </div>
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-medium tracking-tight text-white leading-[1.05] max-w-4xl mb-12">
          Build the next generation of <span className="text-white font-bold">onchain AI</span> with the fastest FHE execution network
        </h1>
        <div className="flex flex-col sm:flex-row items-center gap-6 mt-4 mb-32 w-full sm:w-auto">
          <Link
            to="/inference/new"
            className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 px-8 py-4 rounded-xl font-bold transition-all text-sm group w-full sm:w-auto justify-center"
          >
            Start Inference
          </Link>
          <a
            href="https://cofhe-docs.fhenix.zone/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-transparent text-white border border-white/20 hover:bg-white/5 px-8 py-4 rounded-xl font-bold transition-all text-sm w-full sm:w-auto justify-center"
          >
            Read docs
          </a>
        </div>
      </motion.div>
    )
  }

  // Kageyomi Dashboard
  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="px-8 py-8 max-w-4xl mx-auto">
          {/* Greeting */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-white">
              {getGreeting()}, Researcher
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Secure isolated environment initialized.</p>
          </div>

          {/* Stats row */}
          <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Active Research Jobs', value: '3', sub: '+1' },
              { label: 'Total Queries', value: '47', sub: 'this month' },
              { label: 'Avg. Response', value: '2.3s', sub: 'isolated enclave' },
              { label: 'Verification Rate', value: '100%', sub: 'on-chain verified' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-5">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">{stat.label}</div>
                <div className="mt-3 text-2xl font-semibold text-white">{stat.value}</div>
                <div className="mt-1 text-[11px] text-zinc-600">{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* CTA button row */}
          <div className="mb-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/inference/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
            >
              <Lock className="w-4 h-4" />
              Run Confidential Analysis
            </Link>
            <div className="flex gap-2">
              {['BTC ETF flows vs CPI', 'MSTR accumulation pattern'].map((p) => (
                <Link
                  key={p}
                  to="/inference/new"
                  className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors"
                >
                  {p}
                </Link>
              ))}
            </div>
          </div>

          {/* Active agents */}
          <div>
            <h2 className="mb-4 text-sm font-semibold text-zinc-300">Active Agents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ACTIVE_AGENTS.map((agent) => (
                <div key={agent.name} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-4 hover:border-zinc-700 transition-colors">
                  <div className="w-9 h-9 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center shrink-0">
                    <agent.icon className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-white truncate">{agent.name}</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 shrink-0" />
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{agent.signal}</div>
                  </div>
                  <div className="ml-auto shrink-0">
                    <BarChart2 className="w-8 h-8 text-zinc-700" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline details */}
          <div>
            <h2 className="mb-4 text-sm font-semibold text-zinc-300">Confidential Pipeline</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: Lock,
                  step: '01',
                  title: 'FHE Encryption',
                  desc: 'Your prompt is encrypted locally with AES-GCM before leaving the browser. The CoFHE key is split and permissioned via on-chain ACL — no node sees plaintext.',
                },
                {
                  icon: Network,
                  step: '02',
                  title: 'Blindference Quorum',
                  desc: 'An ICL-assigned leader node runs the SoSoValue agent under FHE. Two verifiers independently replay from IPFS receipts. All 3 must reach consensus.',
                },
                {
                  icon: TrendingUp,
                  step: '03',
                  title: 'UAVP Verification',
                  desc: 'Leader commits a trace hash on-chain. Verifiers validate execution determinism via UAVP replay before the result is accepted and output returned to you.',
                },
              ].map(({ icon: Icon, step, title, desc }) => (
                <div key={step} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-zinc-400" />
                    </div>
                    <span className="font-mono text-[10px] text-zinc-700">{step}</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">{title}</div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right sidebar — Execution trace */}
      <div className="hidden xl:flex w-64 shrink-0 flex-col border-l border-zinc-800 bg-[#0d0d0d] px-5 py-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500 mb-6">Execution Trace</p>
        <div className="space-y-5">
          {EXECUTION_STEPS.map((step, i) => (
            <div key={step} className="flex items-start gap-3">
              <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${i === 0 ? 'bg-zinc-300' : 'bg-zinc-700'}`} />
              <div>
                <div className={`text-sm ${i === 0 ? 'text-zinc-200 font-medium' : 'text-zinc-600'}`}>{step}</div>
                {i === 0 && (
                  <div className="text-[11px] text-zinc-600 mt-0.5">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} PM
                  </div>
                )}
                {step === 'Quorum Verification' && (
                  <div className="text-[11px] text-zinc-700 mt-0.5">Fhenix network consensus</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentCard({ icon: Icon, name, desc, detail }: { icon: any, name: string, desc: string, detail: string }) {
  return (
    <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:-translate-y-1 transition-transform group">
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-white/[0.05] transition-colors">
        <Icon className="w-6 h-6 text-zinc-300 group-hover:text-zinc-300 transition-colors" />
      </div>
      <h3 className="text-xl font-bold mb-1 text-white">{name}</h3>
      <div className="text-sm text-zinc-300 font-medium mb-3">{desc}</div>
      <p className="text-zinc-400 text-sm leading-relaxed">{detail}</p>
    </div>
  )
}
