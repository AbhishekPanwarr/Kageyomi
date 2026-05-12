import Groq from 'groq-sdk'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { composeMockInsight } from '../agent/groq-agent.js'
import { sha256Hex, type ToolReceipt } from '../uavp/receipt-manager.js'

const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

export async function verifyAgentJob(
  receiptsCID: string,
  prompt: string,
  expectedOutputHash: string,
): Promise<boolean> {
  const receipts = await loadReceiptsFromIPFS(receiptsCID)

  if (process.env.KAGEYOMI_MOCK_GROQ === 'true') {
    return sha256Hex(composeMockInsight(prompt, receipts)) === normalizeHash(expectedOutputHash)
  }

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const messages: Array<Record<string, unknown>> = [
    {
      role: 'system',
      content:
        'You are Kageyomi, a deterministic crypto research agent. Base your final answer only on tool outputs returned in this thread.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ]

  for (const receipt of receipts) {
    messages.push({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: receipt.toolCallId,
          type: 'function',
          function: {
            name: receipt.toolName,
            arguments: receipt.toolArgumentsJson,
          },
        },
      ],
    })
    messages.push({
      role: 'tool',
      tool_call_id: receipt.toolCallId,
      content: receipt.canonicalData,
    })
  }

  const response = await groq.chat.completions.create({
    model: DEFAULT_MODEL,
    temperature: 0,
    top_p: 1,
    seed: 42,
    messages: messages as never,
  })

  const output = response.choices[0]?.message?.content?.trim()
  if (!output) {
    throw new Error('Groq returned an empty replay response')
  }

  return sha256Hex(output) === normalizeHash(expectedOutputHash)
}

async function loadReceiptsFromIPFS(cid: string): Promise<ToolReceipt[]> {
  if (process.env.KAGEYOMI_MOCK_IPFS === 'true') {
    const directory = process.env.KAGEYOMI_MOCK_IPFS_DIR || path.resolve(process.cwd(), '.mock-ipfs')
    const fileContents = await readFile(path.join(directory, `${cid}.json`), 'utf8')
    return JSON.parse(fileContents) as ToolReceipt[]
  }

  const baseUrl = (process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs').replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/${cid}`)

  if (!response.ok) {
    throw new Error(`Failed to load receipts from IPFS: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<ToolReceipt[]>
}

function normalizeHash(value: string): string {
  return value.startsWith('0x') ? value : `0x${value}`
}
