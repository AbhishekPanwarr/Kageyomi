import crypto from 'node:crypto'
import Groq from 'groq-sdk'

import { canonicalizeSosoResponse, type CanonicalDataType } from '../canonicalize/uavp-canonicalize.js'
import { executeSosoTool, SOSO_TOOLS } from '../tools/sosovalue-tools.js'
import {
  computeTraceHash,
  computeMerkleRoot,
  createReceipt,
  postReceiptsToIPFS,
  sha256Hex,
  signReceipt,
  type ToolReceipt,
} from '../uavp/receipt-manager.js'
import { stableJson } from '../utils/stable-json.js'

const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
const MAX_TOOL_CALLS = clampMaxTools(Number(process.env.KAGEYOMI_MAX_TOOLS || 5))

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
}

export type AgentJobResult = {
  jobId: string
  output: string
  outputHash: string
  receiptRoot: string
  receiptsCID: string
  traceHash: string
  receipts: ToolReceipt[]
}

export async function runAgentJob(prompt: string): Promise<AgentJobResult> {
  if (process.env.KAGEYOMI_MOCK_GROQ === 'true') {
    return runMockAgentJob(prompt)
  }

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  })

  const jobId = cryptoRandomJobId()
  const receipts: ToolReceipt[] = []
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are Kageyomi, a deterministic crypto research agent. Use at most five tool calls. Base your final answer only on tool outputs returned in this thread.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ]

  for (let step = 0; step < MAX_TOOL_CALLS; step += 1) {
    const response = await groq.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0,
      top_p: 1,
      seed: 42,
      messages: messages as never,
      tools: SOSO_TOOLS as never,
      tool_choice: 'auto' as never,
    })

    const message = response.choices[0]?.message
    const toolCalls = message?.tool_calls
    if (!toolCalls || toolCalls.length === 0) {
      break
    }

    messages.push({
      role: 'assistant',
      content: message.content ?? null,
      tool_calls: toolCalls.map((call) => ({
        id: call.id ?? `${call.function.name}-${step}`,
        type: 'function',
        function: {
          name: call.function.name,
          arguments: call.function.arguments,
        },
      })),
    })

    for (const call of toolCalls) {
      const toolCallId = call.id ?? `${call.function.name}-${step}`
      const argsJson = call.function.arguments
      const args = JSON.parse(argsJson) as unknown
      const raw = await executeSosoTool(call.function.name, args)
      const dataType: CanonicalDataType = call.function.name.includes('news') ? 'text' : 'json'
      const canonicalData = canonicalizeSosoResponse(raw, dataType)

      const unsignedReceipt = createReceipt({
        jobId,
        toolName: call.function.name,
        toolCallId,
        toolArgumentsJson: stableJson(args),
        paramsHash: sha256Hex(stableJson(args)),
        responseHash: sha256Hex(canonicalData),
        canonicalData,
        dataType,
        timestampMs: Date.now(),
      })

      const signedReceipt = process.env.NODE_PRIVATE_KEY
        ? await signReceipt(unsignedReceipt, process.env.NODE_PRIVATE_KEY)
        : unsignedReceipt

      receipts.push(signedReceipt)
      messages.push({
        role: 'tool',
        tool_call_id: toolCallId,
        content: canonicalData,
      })
    }
  }

  const finalResponse = await groq.chat.completions.create({
    model: DEFAULT_MODEL,
    temperature: 0,
    top_p: 1,
    seed: 42,
    messages: messages as never,
  })

  const output = finalResponse.choices[0]?.message?.content?.trim()
  if (!output) {
    throw new Error('Groq returned an empty final response')
  }

  const receiptsCID = await postReceiptsToIPFS(receipts)
  const receiptRoot = computeMerkleRoot(receipts.map((receipt) => receipt.responseHash))
  const outputHash = sha256Hex(output)
  const traceHash = computeTraceHash({
    prompt,
    outputHash,
    receiptRoot,
    receiptsCID,
    model: DEFAULT_MODEL,
    toolCount: receipts.length,
  })

  return {
    jobId,
    output,
    outputHash,
    receiptRoot,
    receiptsCID,
    traceHash,
    receipts,
  }
}

async function runMockAgentJob(prompt: string): Promise<AgentJobResult> {
  const jobId = cryptoRandomJobId()
  const requestedTools = inferMockToolPlan(prompt)
  const receipts: ToolReceipt[] = []

  for (const plan of requestedTools) {
    const raw = await executeSosoTool(plan.toolName, plan.args)
    const dataType: CanonicalDataType = plan.toolName.includes('news') ? 'text' : 'json'
    const canonicalData = canonicalizeSosoResponse(raw, dataType)

    const unsignedReceipt = createReceipt({
      jobId,
      toolName: plan.toolName,
      toolCallId: `${plan.toolName}-mock`,
      toolArgumentsJson: stableJson(plan.args),
      paramsHash: sha256Hex(stableJson(plan.args)),
      responseHash: sha256Hex(canonicalData),
      canonicalData,
      dataType,
      timestampMs: Date.now(),
    })

    receipts.push(
      process.env.NODE_PRIVATE_KEY ? await signReceipt(unsignedReceipt, process.env.NODE_PRIVATE_KEY) : unsignedReceipt,
    )
  }

  const output = composeMockInsight(prompt, receipts)
  const receiptsCID = await postReceiptsToIPFS(receipts)
  const receiptRoot = computeMerkleRoot(receipts.map((receipt) => receipt.responseHash))
  const outputHash = sha256Hex(output)
  const traceHash = computeTraceHash({
    prompt,
    outputHash,
    receiptRoot,
    receiptsCID,
    model: 'mock-kageyomi-agent',
    toolCount: receipts.length,
  })

  return {
    jobId,
    output,
    outputHash,
    receiptRoot,
    receiptsCID,
    traceHash,
    receipts,
  }
}

function cryptoRandomJobId(): string {
  return `0x${crypto.randomBytes(32).toString('hex')}`
}

function clampMaxTools(value: number): number {
  if (!Number.isFinite(value)) {
    return 5
  }
  return Math.max(1, Math.min(5, Math.trunc(value)))
}

function inferMockToolPlan(prompt: string): Array<{ toolName: string; args: Record<string, unknown> }> {
  const lowered = prompt.toLowerCase()
  const plans: Array<{ toolName: string; args: Record<string, unknown> }> = []

  if (lowered.includes('etf') || lowered.includes('btc')) {
    plans.push({
      toolName: 'fetch_ETF_summary_history',
      args: { symbol: 'BTC', country_code: 'US', limit: 7 },
    })
  }

  if (lowered.includes('cpi') || lowered.includes('macro')) {
    plans.push({
      toolName: 'fetch_macro_history',
      args: { event: 'CPI', limit: 5 },
    })
  }

  if (lowered.includes('news') || lowered.includes('sentiment')) {
    plans.push({
      toolName: 'fetch_news_search',
      args: { keyword: 'btc etf', category: 1, page_size: 10 },
    })
  }

  if (lowered.includes('treasury') || lowered.includes('mstr')) {
    plans.push({
      toolName: 'fetch_btc_treasury_history',
      args: { ticker: 'MSTR', limit: 5 },
    })
  }

  if (lowered.includes('mag7') || lowered.includes('layer1') || lowered.includes('index')) {
    plans.push({
      toolName: 'fetch_index_snapshot',
      args: { ticker: lowered.includes('layer1') ? 'ssilayer1' : 'ssimag7' },
    })
  }

  if (plans.length === 0) {
    plans.push(
      { toolName: 'fetch_ETF_summary_history', args: { symbol: 'BTC', country_code: 'US', limit: 7 } },
      { toolName: 'fetch_macro_history', args: { event: 'CPI', limit: 5 } },
    )
  }

  return plans.slice(0, MAX_TOOL_CALLS)
}

export function composeMockInsight(prompt: string, receipts: ToolReceipt[]): string {
  const digest = receipts.map((receipt) => `${receipt.toolName}:${receipt.responseHash.slice(0, 12)}`).join(' | ')
  return `Kageyomi mock insight for "${prompt}": validated ${receipts.length} canonical receipts. ${digest}`
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const prompt = process.argv.slice(2).join(' ').trim() || 'btc etf inflow vs cpi'
  runAgentJob(prompt)
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.stack || error.message : String(error)
      process.stderr.write(`${message}\n`)
      process.exitCode = 1
    })
}
