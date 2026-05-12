const STRIP_FIELDS = new Set([
  'code',
  'message',
  'timestamp',
  'request_id',
  'nonce',
  'trace_id',
  'server_time',
  'latency_ms',
])

export type CanonicalDataType = 'json' | 'text'

export function canonicalizeSosoResponse(raw: unknown, dataType: CanonicalDataType): string {
  const payload = unwrapData(raw)

  if (dataType === 'text') {
    return canonicalizeText(payload)
  }

  const cleaned = stripFields(payload)
  const normalized = normalizeNumbers(cleaned, 6)
  return JSON.stringify(sortKeysDeep(normalized))
}

function unwrapData(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'data' in raw) {
    return (raw as { data: unknown }).data
  }
  return raw
}

function canonicalizeText(payload: unknown): string {
  const text = extractText(payload)
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/&nbsp;/gi, ' ')

  return decodeHtmlEntities(text)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function extractText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map(extractText).filter(Boolean).join(' ')
  }

  if (value && typeof value === 'object') {
    return Object.values(value).map(extractText).filter(Boolean).join(' ')
  }

  return ''
}

function stripFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripFields)
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value)) {
      if (!STRIP_FIELDS.has(key)) {
        output[key] = stripFields(nested)
      }
    }
    return output
  }

  return value
}

function normalizeNumbers(value: unknown, decimals: number): unknown {
  if (typeof value === 'number') {
    return Number(value.toFixed(decimals))
  }

  if (typeof value === 'string' && /^-?\d+\.\d+$/.test(value)) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Number(parsed.toFixed(decimals))
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeNumbers(item, decimals))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, normalizeNumbers(nested, decimals)]),
    )
  }

  return value
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortKeysDeep(nested)]),
    )
  }

  return value
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}
