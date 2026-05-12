import crypto from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { privateKeyToAccount } from 'viem/accounts'

import type { CanonicalDataType } from '../canonicalize/uavp-canonicalize.js'

export type ToolReceiptInput = {
  jobId: string
  toolName: string
  toolCallId: string
  toolArgumentsJson: string
  paramsHash: string
  responseHash: string
  canonicalData: string
  dataType: CanonicalDataType
  timestampMs: number
}

export type ToolReceipt = ToolReceiptInput & {
  receiptHash: string
  signature?: string
}

export function createReceipt(input: ToolReceiptInput): ToolReceipt {
  const receiptHash = sha256Hex(
    JSON.stringify(
      {
        jobId: input.jobId,
        toolName: input.toolName,
        toolCallId: input.toolCallId,
        toolArgumentsJson: input.toolArgumentsJson,
        paramsHash: input.paramsHash,
        responseHash: input.responseHash,
        dataType: input.dataType,
        canonicalData: input.canonicalData,
        timestampMs: input.timestampMs,
      },
      Object.keys(input).sort(),
    ),
  )

  return {
    ...input,
    receiptHash,
  }
}

export async function signReceipt(receipt: ToolReceipt, privateKey: string): Promise<ToolReceipt> {
  const account = privateKeyToAccount(normalizeHex(privateKey))
  const signature = await account.signMessage({ message: { raw: hexToBytes(receipt.receiptHash) } })
  return {
    ...receipt,
    signature,
  }
}

export async function postReceiptsToIPFS(receipts: ToolReceipt[]): Promise<string> {
  if (process.env.KAGEYOMI_MOCK_IPFS === 'true') {
    const cid = sha256Hex(JSON.stringify(receipts)).slice(2)
    const directory = process.env.KAGEYOMI_MOCK_IPFS_DIR || path.resolve(process.cwd(), '.mock-ipfs')
    await mkdir(directory, { recursive: true })
    await writeFile(path.join(directory, `${cid}.json`), JSON.stringify(receipts, null, 2), 'utf8')
    return cid
  }

  const pinataJwt = process.env.PINATA_JWT
  if (!pinataJwt) {
    throw new Error('PINATA_JWT is not configured')
  }

  const payload = Buffer.from(JSON.stringify(receipts), 'utf8')
  const formData = new FormData()
  formData.append('file', new Blob([payload]), 'kageyomi-receipts.json')
  formData.append('network', 'public')
  formData.append('name', 'kageyomi-receipts.json')

  const response = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pinataJwt}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`IPFS receipt upload failed: ${response.status} ${response.statusText}`)
  }

  const json = (await response.json()) as { data?: { cid?: string } }
  const cid = json.data?.cid
  if (!cid) {
    throw new Error(`IPFS receipt upload returned no CID: ${JSON.stringify(json)}`)
  }

  return cid
}

export function computeMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) {
    return sha256Hex('')
  }

  let level: Array<`0x${string}`> = leaves.map((leaf) => normalizeHex(leaf))
  while (level.length > 1) {
    const next: Array<`0x${string}`> = []
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index]
      const right = level[index + 1] ?? left
      next.push(normalizeHex(sha256Hex(Buffer.concat([hexToBytes(left), hexToBytes(right)]))))
    }
    level = next
  }
  return level[0]
}

export function sha256Hex(value: string | Buffer): string {
  return `0x${crypto.createHash('sha256').update(value).digest('hex')}`
}

export function computeTraceHash(input: {
  prompt: string
  outputHash: string
  receiptRoot: string
  receiptsCID: string
  model: string
  toolCount: number
}): string {
  return sha256Hex(
    JSON.stringify(
      {
        promptHash: sha256Hex(input.prompt),
        outputHash: normalizeHex(input.outputHash),
        receiptRoot: normalizeHex(input.receiptRoot),
        receiptsCID: input.receiptsCID,
        model: input.model,
        toolCount: input.toolCount,
      },
      Object.keys(input).sort(),
    ),
  )
}

function normalizeHex(value: string): `0x${string}` {
  return (value.startsWith('0x') ? value : `0x${value}`) as `0x${string}`
}

function hexToBytes(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value.replace(/^0x/, ''), 'hex'))
}
