import { readFile } from 'node:fs/promises'

const SOSO_BASE_URL = 'https://openapi.sosovalue.com/openapi/v1'
const DEFAULT_REQUESTS_PER_MINUTE = 10

type RequestQuery = Record<string, string | number | boolean | undefined>

const queue: { task: () => Promise<Response>; resolve: (value: any) => void; reject: (reason?: any) => void }[] = [];
let processing = false;

async function processQueue() {
  if (queue.length === 0) { 
    processing = false; 
    return; 
  }
  processing = true;
  const { task, resolve, reject } = queue.shift()!;
  try {
    const response = await task();
    if (!response.ok) {
      reject(new Error(`SoSoValue request failed: ${response.status} ${response.statusText}`));
      return;
    }
    const result = await response.json();
    resolve(result);
  } catch (err) {
    reject(err);
  } finally {
    setTimeout(processQueue, getRequestSpacingMs());
  }
}

async function safeFetch<T>(url: URL, options?: RequestInit): Promise<T> {
  return new Promise((resolve, reject) => {
    queue.push({
      task: async () => fetch(url, options),
      resolve,
      reject
    });
    if (!processing) processQueue();
  });
}

export async function fetchSosoValue<T>(path: string, query: RequestQuery = {}): Promise<T> {
  const mockResponse = await maybeLoadMockResponse<T>(path, query)
  if (mockResponse !== undefined) {
    return mockResponse
  }

  const apiKey = process.env.SOSOVALUE_API_KEY
  if (!apiKey) {
    throw new Error('SOSOVALUE_API_KEY is not configured')
  }

  const url = new URL(`${SOSO_BASE_URL}${path}`)
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value))
    }
  }

  return safeFetch<T>(url, {
    headers: {
      'x-soso-api-key': apiKey,
    },
  })
}

async function maybeLoadMockResponse<T>(path: string, query: RequestQuery): Promise<T | undefined> {
  if (!shouldUseMockSosoResponses()) {
    return undefined
  }

  const mockFile = process.env.SOSOVALUE_MOCK_FILE
  if (!mockFile) {
    return undefined
  }

  const url = new URL(`https://mock.local${path}`)
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value))
    }
  }

  const fileUrl = new URL(mockFile, import.meta.url)
  const fileContents = await readFile(fileUrl, 'utf8')
  const mockResponses = JSON.parse(fileContents) as Record<string, T>
  const key = `${url.pathname}?${[...url.searchParams.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')}`
  if (!(key in mockResponses)) {
    throw new Error(`Missing mock SoSoValue response for key: ${key}`)
  }

  return mockResponses[key]
}

function shouldUseMockSosoResponses(): boolean {
  const flag = process.env.KAGEYOMI_USE_MOCK_SOSO
  if (!flag) {
    return false
  }

  return ['1', 'true', 'yes', 'on'].includes(flag.trim().toLowerCase())
}

function getRequestSpacingMs(): number {
  const configured = Number(process.env.SOSO_REQUESTS_PER_MINUTE || DEFAULT_REQUESTS_PER_MINUTE)
  const requestsPerMinute = Number.isFinite(configured) && configured > 0
    ? Math.max(1, Math.trunc(configured))
    : DEFAULT_REQUESTS_PER_MINUTE

  return Math.ceil(60_000 / requestsPerMinute)
}
