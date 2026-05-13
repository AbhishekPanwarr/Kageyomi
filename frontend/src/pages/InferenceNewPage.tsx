import { useEffect, useRef, useState } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { Lock, ShieldAlert, Cpu, CheckCircle2, Loader2, ChevronDown, Plus, X, Sparkles, Zap, BarChart2, Newspaper, Landmark, Globe, Network, ArrowUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Hex } from 'viem'
import axios from 'axios'

import { inferenceApi } from '../api/inferenceApi'
import { useCofheClient } from '../hooks/useCofheClient'
import { useChat } from '../hooks/useChat'
import { storePromptKeyForTextRequest } from '../lib/promptKeyStore'
import { encryptPromptKeyForTextRequest } from '../utils/textPromptKey'
import { ChatView } from '../components/inference/ChatView'


const KAGEYOMI_AGENT_MODE = import.meta.env.VITE_KAGEYOMI_AGENT_MODE === 'true'

const TEXT_MODEL_OPTIONS = {
  groq_llama_70b: { id: 'groq:llama-3.3-70b-versatile', label: 'Groq Llama 70B', provider: 'groq', model: 'llama-3.3-70b-versatile', description: 'Fast · Groq-hosted · Llama 70B' },
  gemini_flash: { id: 'gemini:gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini', model: 'gemini-2.5-flash', description: 'Fast · Google Gemini 2.5 Flash' },
} as const
type TextModelKey = keyof typeof TEXT_MODEL_OPTIONS

const AGENT_DEFS = [
  { key: 'FullGraph',      label: 'Auto Router',        icon: Sparkles,  desc: 'Routes the brief across specialists and composes the final thesis' },
  { key: 'FlowSentinel',   label: 'FlowSentinel',       icon: Zap,       desc: 'ETF flow and institutional demand tracker' },
  { key: 'NarrativeScope', label: 'NarrativeScope',     icon: Newspaper, desc: 'News, narrative, and sentiment reader' },
  { key: 'TreasuryRadar',  label: 'TreasuryRadar',      icon: Landmark,  desc: 'Corporate and public BTC treasury tracker' },
  { key: 'IndexArb',       label: 'IndexArb',           icon: BarChart2, desc: 'Crypto index relative-strength scanner' },
  { key: 'MacroShield',    label: 'MacroShield',        icon: Globe,     desc: 'Macro surprise and cross-market risk mapper' },
  { key: 'VentureMap',     label: 'VentureMap',         icon: Network,   desc: 'Private funding and venture rotation tracker' },
] as const
type AgentKey = typeof AGENT_DEFS[number]['key']
const KAGEYOMI_AGENTS = AGENT_DEFS.map(a => a.key)

type Stage = 'idle' | 'encrypting' | 'uploading' | 'submitting'

const TRACE_STEPS = [
  { key: 'encrypt',  label: 'Brief Sealed',           sub: 'AES-GCM + CoFHE key split' },
  { key: 'icl',      label: 'Research Quorum',        sub: 'Leader + 2 verifiers assigned' },
  { key: 'leader',   label: 'Lead Agent Run',         sub: 'SoSoValue tools + specialist reasoning' },
  { key: 'quorum',   label: 'Verifier Replay',        sub: 'Frozen receipts checked for hash match' },
  { key: 'onchain',  label: 'Trace Anchored',         sub: 'Receipt root + trace hash committed' },
  { key: 'decrypt',  label: 'Local Reveal',           sub: 'Result decrypted only in your browser' },
]

function resolveDefaultModelKey(): TextModelKey {
  return import.meta.env.VITE_TEXT_MODEL_DEFAULT === TEXT_MODEL_OPTIONS.gemini_flash.id ? 'gemini_flash' : 'groq_llama_70b'
}

function generateKey(): Uint8Array { return crypto.getRandomValues(new Uint8Array(32)) }
function generateTaskId(): Hex {
  const b = crypto.getRandomValues(new Uint8Array(32))
  return `0x${Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')}` as Hex
}
async function encryptText(text: string, key: Uint8Array) {
  const iv = crypto.getRandomValues(new Uint8Array(16))
  const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt'])
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, cryptoKey, new TextEncoder().encode(text))
  const bytes = new Uint8Array(encrypted)
  return { iv, authTag: bytes.subarray(bytes.length - 16), ciphertext: bytes.subarray(0, bytes.length - 16) }
}
function packPayload(p: { iv: Uint8Array; authTag: Uint8Array; ciphertext: Uint8Array }): Uint8Array {
  const out = new Uint8Array(p.iv.length + p.authTag.length + p.ciphertext.length)
  out.set(p.iv, 0); out.set(p.authTag, p.iv.length); out.set(p.ciphertext, p.iv.length + p.authTag.length)
  return out
}
async function uploadToICL(data: Uint8Array): Promise<string> {
  const ms = Number(import.meta.env.VITE_PROMPT_UPLOAD_TIMEOUT_MS || '60000')
  const res = await Promise.race([
    inferenceApi.uploadPromptBlob(new Blob([data])),
    new Promise<never>((_, r) => setTimeout(() => r(new Error('Upload timed out. Check ICL/Pinata.')), ms)),
  ])
  if (!res.data?.cid) throw new Error('No CID in upload response')
  return res.data.cid
}

// ---- Trace step state ----
type StepStatus = 'pending' | 'active' | 'done' | 'error'
function stepStatus(key: string, stage: Stage, requestId: string | null, jobStatus: string | null): StepStatus {
  if (!requestId) {
    if (key === 'encrypt') return stage === 'encrypting' ? 'active' : stage === 'uploading' || stage === 'submitting' ? 'done' : 'pending'
    if (key === 'icl') return stage === 'uploading' ? 'active' : stage === 'submitting' ? 'done' : 'pending'
    return 'pending'
  }
  // after submission
  const order = ['encrypt', 'icl', 'leader', 'quorum', 'onchain', 'decrypt']
  const idx = order.indexOf(key)
  let reached = 1 // encrypt + icl done once submitted
  if (jobStatus === 'ASSIGNED' || jobStatus === 'EXECUTING') reached = 2
  if (jobStatus === 'VERIFYING') reached = 3
  if (jobStatus === 'ACCEPTED') reached = 5
  if (jobStatus === 'ACCEPTED' && key === 'decrypt') return 'active'
  if (idx < reached) return 'done'
  if (idx === reached) return 'active'
  return 'pending'
}

export function InferenceNewPage() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { client: cofheClient, isReady } = useCofheClient()
  const { messages, pushUserMessage, updateAssistantStatus, failAssistantMessage, setActiveRequestId, status } = useChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [prompt, setPrompt] = useState('')
  const [selectedModelKey, setSelectedModelKey] = useState<TextModelKey>(resolveDefaultModelKey)
  const [selectedAgent, setSelectedAgent] = useState<AgentKey>('FullGraph')
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const plusRef = useRef<HTMLDivElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)

  const hasMessages = messages.length > 0
  const isBusy = stage !== 'idle'

  const selectedModel = TEXT_MODEL_OPTIONS[selectedModelKey]

  const handleSubmit = async () => {
    const normalizedPrompt = prompt.trim()
    if (!normalizedPrompt) { setError('Please enter a prompt first.'); return }
    if (!cofheClient || !isReady || !address) { setError('Connect your wallet and wait for CoFHE to initialize.'); return }
    if (!publicClient || !walletClient) { setError('Wallet client is not available.'); return }
    const promptKeyStoreAddress = import.meta.env.VITE_PROMPT_KEY_STORE_ADDRESS as Hex | undefined
    if (!promptKeyStoreAddress) { setError('VITE_PROMPT_KEY_STORE_ADDRESS not configured.'); return }

    const assistantId = pushUserMessage(normalizedPrompt, agentDef.label, selectedModel.label)
    setPrompt('')
    setError(null)

    try {
      setStage('encrypting')
      updateAssistantStatus(assistantId, 'encrypting')

      const promptKey = generateKey()
      const encrypted = await encryptText(normalizedPrompt, promptKey)
      const packed = packPayload(encrypted)
      const encryptedPromptKey = await encryptPromptKeyForTextRequest(cofheClient, promptKey)
      const taskId = generateTaskId()

      const quorumPreview = await inferenceApi.getQuorumPreview({ model_id: selectedModel.id, min_tier: 1, verifier_count: 2, zdr_required: false })
      const allowedNodes = [quorumPreview.data.leader, ...quorumPreview.data.verifiers] as Hex[]

      await storePromptKeyForTextRequest({
        taskId,
        encryptedHighInput: encryptedPromptKey.metadata.cofhe_prompt_key_inputs.high as never,
        encryptedLowInput: encryptedPromptKey.metadata.cofhe_prompt_key_inputs.low as never,
        allowedNodes, promptKeyStoreAddress, publicClient, walletClient,
      })

      setStage('uploading')
      updateAssistantStatus(assistantId, 'processing')
      const promptCID = await uploadToICL(packed)

      setStage('submitting')
      const response = await inferenceApi.submitText({
        developer_address: address, task_id: taskId, mode: 'text', model_id: selectedModel.id,
        leader_address: quorumPreview.data.leader, verifier_addresses: quorumPreview.data.verifiers,
        text_request: { prompt_cid: promptCID, encrypted_prompt_key: { high: encryptedPromptKey.encryptedPromptKey.high, low: encryptedPromptKey.encryptedPromptKey.low }, model_id: selectedModel.id, coverage_enabled: false },
        min_tier: 1, zdr_required: false, verifier_count: 2,
        metadata: {
          cofhe_prompt_key_inputs: encryptedPromptKey.metadata.cofhe_prompt_key_inputs,
          prompt_length: normalizedPrompt.length, vertical: 'kageyomi-uavp-demo',
          provider: selectedModel.provider, model: selectedModel.model,
          is_agent_job: true, uavp_enabled: true, kageyomi_agent: selectedAgent,
          prompt_key_store_tx: '', prompt_key_store_status: 'stored_by_user',
          prompt_key_store_address: promptKeyStoreAddress,
        },
      })

      const payload = response.data
      const rid = ('job_id' in payload && typeof payload.job_id === 'string' && payload.job_id) ||
                  ('request_id' in payload && typeof payload.request_id === 'string' && payload.request_id)
      if (!rid) throw new Error('ICL did not return a request ID.')
      updateAssistantStatus(assistantId, 'processing', rid)
      setActiveRequestId(rid)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail
        if (typeof detail === 'string' && detail.trim()) { failAssistantMessage(assistantId, detail); setStage('idle'); return }
      }
      failAssistantMessage(assistantId, err instanceof Error ? err.message : 'Submission failed.')
    } finally {
      setStage('idle')
    }
  }

  if (!KAGEYOMI_AGENT_MODE) {
    // fallback: original non-agent layout
    return (
      <div className="mx-auto max-w-2xl pb-20 pt-12 px-6">
        <h1 className="mb-2 text-3xl font-medium text-white tracking-tight">New Text Inference</h1>
        <p className="text-sm text-zinc-500 mb-8">Launch a private research run backed by Fhenix confidential inferencing.</p>
      </div>
    )
  }

  const agentDef = AGENT_DEFS.find(a => a.key === selectedAgent)!

  const jobStatus = status?.status ?? null
  const latestRequestId = [...messages].reverse().find(m => m.role === 'assistant' && m.requestId)?.requestId ?? null

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages.length])

  return (
    <div className="flex h-full min-h-screen">
      {/* CENTER: chat layout */}
      <div className="flex-1 min-w-0 flex flex-col h-screen">

        {/* Scrollable message area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-2xl">

            {/* Empty state heading */}
            <AnimatePresence>
              {!hasMessages && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-3 pb-8">
                  <h1 className="text-3xl font-semibold tracking-tight text-white">What market question are we testing?</h1>
                  <p className="text-sm text-zinc-500">Route a crypto research brief through Kageyomi&apos;s specialist agents, with Fhenix keeping the brief and result private.</p>
                  {/* Quick chips */}
                  <div className="flex flex-wrap justify-center gap-2 pt-4">
                    {[
                      { icon: BarChart2, label: 'BTC ETF flows vs CPI surprise' },
                      { icon: Landmark, label: 'MSTR treasury cadence' },
                      { icon: Globe, label: 'Macro risk into next print' },
                      { icon: Newspaper, label: 'Latest BTC narrative shift' },
                    ].map(({ icon: Icon, label }) => (
                      <button key={label} type="button" onClick={() => setPrompt(label)}
                        className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all">
                        <Icon className="w-3.5 h-3.5" />{label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat messages */}
            <ChatView messages={messages} />
          </div>
        </div>

        {/* ── Sticky bottom input ── */}
        <div className="border-t border-zinc-800 bg-[#0a0a0a] px-6 py-4">
          <div className="mx-auto max-w-2xl space-y-2">

            {/* Model picker + error row */}
            <div className="flex items-center gap-3">
              <div className="relative" ref={modelRef}>
                <button type="button" onClick={() => setShowModelPicker(v => !v)} disabled={isBusy}
                  className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors disabled:opacity-50">
                  <Cpu className="w-3.5 h-3.5 text-zinc-400" />{selectedModel.label}
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${showModelPicker ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showModelPicker && (
                    <motion.div initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }} transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl z-50 overflow-hidden">
                      {Object.entries(TEXT_MODEL_OPTIONS).map(([k, o]) => (
                        <button key={k} type="button" onClick={() => { setSelectedModelKey(k as TextModelKey); setShowModelPicker(false) }}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-zinc-800 transition-colors ${selectedModelKey === k ? 'bg-zinc-800' : ''}`}>
                          <Cpu className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-white flex items-center gap-2">
                              {o.label}{selectedModelKey === k && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300" />}
                            </div>
                            <div className="text-xs text-zinc-500 mt-0.5">{o.description}</div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-xs text-red-400">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />{error}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input box */}
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/70">
              <div className="px-4 pt-3 pb-0">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
                  <agentDef.icon className="w-3 h-3 text-zinc-400" />
                  {agentDef.label}
                  {!isBusy && (
                    <button type="button" onClick={() => setShowPlusMenu(true)} className="ml-1 text-zinc-500 hover:text-zinc-300 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <textarea rows={2}
                className="w-full resize-none bg-transparent px-4 pt-2 pb-2 text-sm leading-relaxed text-white placeholder:text-zinc-600 focus:outline-none"
                placeholder="Ask anything about crypto markets… (⌘↵ to send)"
                value={prompt} onChange={e => setPrompt(e.target.value)} disabled={isBusy}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isBusy) handleSubmit() }}
              />
              <div className="flex items-center justify-between px-3 pb-3 pt-1 border-t border-zinc-800">
                {/* Plus / agent menu */}
                <div className="relative" ref={plusRef}>
                  <button type="button" onClick={() => setShowPlusMenu(v => !v)} disabled={isBusy}
                    className="flex items-center justify-center w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-40">
                    <Plus className="w-4 h-4" />
                  </button>
                  <AnimatePresence>
                    {showPlusMenu && (
                      <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-zinc-700 bg-[#1a1a1a] shadow-2xl z-50 overflow-hidden">
                        <div className="px-3 pt-3 pb-1"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Research Agent</p></div>
                        {AGENT_DEFS.map((agent, i) => {
                          const Icon = agent.icon; const isSel = selectedAgent === agent.key
                          return (
                            <button key={agent.key} type="button" onClick={() => { setSelectedAgent(agent.key as AgentKey); setShowPlusMenu(false) }}
                              className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${isSel ? 'bg-zinc-800' : 'hover:bg-zinc-800/60'} ${i === 0 ? 'mt-1 border-b border-zinc-800 mb-1' : ''}`}>
                              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSel ? 'text-zinc-200' : 'text-zinc-500'}`} />
                              <div className="min-w-0">
                                <div className={`text-sm font-medium ${isSel ? 'text-white' : 'text-zinc-300'}`}>{agent.label}</div>
                                <div className="text-[11px] text-zinc-600 truncate">{agent.desc}</div>
                              </div>
                              {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300 shrink-0 ml-auto mt-0.5" />}
                            </button>
                          )
                        })}
                        <div className="p-2" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center gap-2">
                  <AnimatePresence>
                    {isBusy && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {stage === 'encrypting' ? 'Sealing brief...' : stage === 'uploading' ? 'Uploading receipts...' : 'Dispatching run...'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <div className="flex items-center gap-1 text-[11px] text-zinc-700"><Lock className="w-3 h-3" /> Private</div>
                  <button type="button" onClick={handleSubmit}
                    disabled={isBusy || !isReady || !address || !prompt.trim()}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Execution Trace sidebar */}
      <div className="hidden xl:flex w-72 shrink-0 flex-col border-l border-zinc-800 bg-[#0d0d0d] px-6 py-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500 mb-8">Research Trace</p>
        <div className="relative flex flex-col gap-0">
          {TRACE_STEPS.map((step, i) => {
            const ss = stepStatus(step.key, stage, latestRequestId, jobStatus)
            const isLast = i === TRACE_STEPS.length - 1
            return (
              <div key={step.key} className="flex gap-3 relative">
                {!isLast && <div className="absolute left-[7px] top-5 w-[2px] h-full bg-zinc-800" />}
                <div className="relative z-10 mt-0.5 shrink-0">
                  {ss === 'done' ? (
                    <div className="w-4 h-4 rounded-full bg-zinc-300 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-black" />
                    </div>
                  ) : ss === 'active' ? (
                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ repeat: Infinity, duration: 1.4 }} className="w-4 h-4 rounded-full bg-white/80" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-zinc-700 bg-zinc-900" />
                  )}
                </div>
                <div className={`pb-7 ${ss === 'pending' ? 'opacity-40' : ''}`}>
                  <div className={`text-sm font-medium ${ss === 'done' ? 'text-zinc-200' : ss === 'active' ? 'text-white' : 'text-zinc-500'}`}>
                    {step.label}
                  </div>
                  {(ss === 'active' || ss === 'done') && (
                    <div className="text-[11px] text-zinc-600 mt-0.5 font-mono">{step.sub}</div>
                  )}
                  {ss === 'active' && latestRequestId && step.key === 'leader' && status?.quorum.leader && (
                    <div className="mt-1.5 text-[10px] text-zinc-500 font-mono break-all">{status.quorum.leader.address.slice(0, 18)}…</div>
                  )}
                  {ss === 'active' && latestRequestId && step.key === 'quorum' && (
                    <div className="mt-1.5 text-[10px] text-zinc-500">{status?.quorum.confirm_count ?? 0}/{(status?.quorum.verifiers.length ?? 2)} confirmed</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {latestRequestId && (
          <div className="mt-auto pt-6 border-t border-zinc-800">
            <div className="text-[10px] uppercase text-zinc-600 mb-1">Request ID</div>
            <div className="font-mono text-[10px] text-zinc-500 break-all">{latestRequestId}</div>
            {status?.status && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[10px] font-semibold text-zinc-300 uppercase tracking-wide">
                <div className={`w-1.5 h-1.5 rounded-full ${status.status === 'ACCEPTED' ? 'bg-zinc-200' : 'animate-pulse bg-zinc-400'}`} />
                {status.status}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


