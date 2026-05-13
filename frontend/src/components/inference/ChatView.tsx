import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, ChevronUp, Copy, CheckCircle2, Link2,
  Sparkles, Loader2, ShieldCheck, MoreHorizontal
} from 'lucide-react'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
export type ChatEntry = {
  id: string
  role: 'user' | 'assistant'
  content: string                  // raw text or decrypted answer
  agent?: string
  model?: string
  status: 'pending' | 'encrypting' | 'processing' | 'done' | 'error'
  requestId?: string
  uavp?: {
    receipt_root?: string
    receipts_cid?: string
    output_hash?: string
    trace_hash?: string
    agent_commitment_tx?: string
  }
  errorMsg?: string
  timestamp: Date
}

/* ─────────────────────────────────────────────
   Parse agent JSON → readable markdown
───────────────────────────────────────────── */
function parseAgentOutput(raw: string): string {
  try {
    const j = JSON.parse(raw)

    // Detect Kageyomi UAVP agent JSON shape
    if (j.thesis || j.stance || j.confidence !== undefined) {
      const lines: string[] = []

      if (j.thesis) lines.push(`## Research Thesis\n${j.thesis}`)
      if (j.stance) {
        const emoji = j.stance === 'bullish' ? '🟢' : j.stance === 'bearish' ? '🔴' : '⚪'
        lines.push(`**Stance:** ${emoji} ${j.stance.charAt(0).toUpperCase() + j.stance.slice(1)}`)
      }
      if (j.confidence !== undefined) {
        const normalized = typeof j.confidence === 'number' && j.confidence > 1 ? j.confidence / 100 : j.confidence
        const pct = Math.round((normalized ?? 0) * 100)
        const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10))
        lines.push(`**Confidence:** ${bar} ${pct}%`)
      }
      if (j.selectedAgent) lines.push(`**Active Agent:** \`${j.selectedAgent}\``)

      if (j.supportingSignals?.length) {
        lines.push(`\n## Supporting Signals`)
        for (const s of j.supportingSignals) {
          if (typeof s === 'string') {
            lines.push(`- ${s}`)
            continue
          }
          const bias = s.bias === 'bullish' ? '▲' : s.bias === 'bearish' ? '▼' : '~'
          const label = s.agent ?? s.index_ticker ?? s.source ?? 'Signal'
          const text = s.signal ?? s.summary ?? s.detail ?? ''
          lines.push(`- **${label}** ${bias} ${text}`)
          if (s.daily_change_pct !== undefined && typeof s.daily_change_pct === 'number' && s.daily_change_pct !== 0) {
            lines.push(`  - Daily: ${s.daily_change_pct > 0 ? '+' : ''}${s.daily_change_pct.toFixed(2)}%`)
          }
        }
      }

      if (j.risks?.length) {
        lines.push(`\n## Risk Factors`)
        for (const r of j.risks) {
          if (typeof r === 'string') {
            lines.push(`- ${r}`)
            continue
          }
          lines.push(`- **${r.risk ?? r.title ?? 'Risk'}:** ${r.description ?? r.detail ?? ''}`)
        }
      }

      if (j.nextStep) lines.push(`\n## Next Step\n${j.nextStep}`)

      return lines.join('\n\n')
    }
  } catch {
    // not JSON — fall through
  }
  return raw
}

/* ─────────────────────────────────────────────
   Markdown renderer (styled)
───────────────────────────────────────────── */
function MD({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-lg font-bold text-white mt-4 mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-semibold text-zinc-200 mt-4 mb-2 uppercase tracking-wide">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-medium text-zinc-300 mt-3 mb-1">{children}</h3>,
        p: ({ children }) => <p className="text-sm text-zinc-300 leading-relaxed my-1.5">{children}</p>,
        ul: ({ children }) => <ul className="space-y-1 my-2 pl-4">{children}</ul>,
        li: ({ children }) => <li className="text-sm text-zinc-300 leading-relaxed list-disc">{children}</li>,
        strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-')
          return isBlock
            ? <code className="block bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-xs font-mono text-zinc-300 overflow-x-auto my-3">{children}</code>
            : <code className="bg-zinc-800 text-zinc-200 rounded px-1.5 py-0.5 text-xs font-mono">{children}</code>
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-zinc-600 pl-4 my-2 text-sm text-zinc-400 italic">{children}</blockquote>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  )
}

/* ─────────────────────────────────────────────
   UAVP Hash detail panel
───────────────────────────────────────────── */
function HashDetail({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-zinc-800/60 last:border-0">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-zinc-600 mb-0.5">{label}</div>
        <div className="font-mono text-[10px] text-zinc-400 break-all leading-relaxed">{value}</div>
      </div>
      <button onClick={copy} className="shrink-0 mt-4 text-zinc-600 hover:text-zinc-300 transition-colors">
        {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

function UavpPanel({ uavp }: { uavp: NonNullable<ChatEntry['uavp']> }) {
  const [open, setOpen] = useState(false)
  const hashes = [
    { label: 'Receipt Root', value: uavp.receipt_root },
    { label: 'Receipts CID', value: uavp.receipts_cid },
    { label: 'Output Hash', value: uavp.output_hash },
    { label: 'Trace Hash', value: uavp.trace_hash },
    { label: 'Agent Commitment Tx', value: uavp.agent_commitment_tx },
  ].filter(h => h.value) as { label: string; value: string }[]

  if (!hashes.length) return null

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>On-chain proof</span>
        <span className="font-mono text-[10px] bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5">
          {hashes.length} hashes
        </span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-1">
              {hashes.map(h => <HashDetail key={h.label} label={h.label} value={h.value} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Individual chat bubble
───────────────────────────────────────────── */
function UserBubble({ entry }: { entry: ChatEntry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-end"
    >
      <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-zinc-800 border border-zinc-700 px-4 py-3">
        <p className="text-sm text-white leading-relaxed">{entry.content}</p>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-600">
          <span>{entry.agent}</span>
          <span>·</span>
          <span>{entry.model}</span>
        </div>
      </div>
    </motion.div>
  )
}

function AssistantBubble({ entry }: { entry: ChatEntry }) {
  const isPending = entry.status !== 'done' && entry.status !== 'error'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      {/* Avatar */}
      <div className="shrink-0 mt-1 w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
        <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Status label */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
            Kageyomi · {entry.agent}
          </span>
          {isPending && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              {entry.status === 'encrypting' ? 'Encrypting...'
                : entry.status === 'processing' ? 'Processing via quorum...'
                : 'Submitting...'}
            </span>
          )}
        </div>

        {/* Content */}
        {isPending ? (
          // Typing indicator
          <div className="flex gap-1 py-2">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="w-2 h-2 rounded-full bg-zinc-600"
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
              />
            ))}
          </div>
        ) : entry.status === 'error' ? (
          <div className="text-sm text-red-400 py-2">{entry.errorMsg ?? 'Something went wrong.'}</div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <MD>{parseAgentOutput(entry.content)}</MD>
            {entry.uavp && <UavpPanel uavp={entry.uavp} />}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   Public ChatView component
───────────────────────────────────────────── */
export function ChatView({ messages }: { messages: ChatEntry[] }) {
  return (
    <div className="space-y-6 py-4">
      {messages.map(entry =>
        entry.role === 'user'
          ? <UserBubble key={entry.id} entry={entry} />
          : <AssistantBubble key={entry.id} entry={entry} />
      )}
    </div>
  )
}
