import { chains, createCofheClient, createCofheConfig, type CofheClient } from './cofhe'

const COFHE_FETCH_ERROR_PATTERNS = [
  'Failed to fetch FHE key and CRS',
  'Error serializing FHE publicKey',
  'Error serializing CRS',
]

function env(name: string): string | undefined {
  const value = import.meta.env[name]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export function resolveCofheEndpoints() {
  const defaultChain = chains.arbSepolia
  return {
    coFheUrl: env('VITE_COFHE_URL') ?? defaultChain.coFheUrl,
    verifierUrl: env('VITE_COFHE_VERIFIER_URL') ?? defaultChain.verifierUrl,
    thresholdNetworkUrl: env('VITE_COFHE_THRESHOLD_URL') ?? defaultChain.thresholdNetworkUrl,
  }
}

export function shouldDisablePersistedFheKeys() {
  const configured = env('VITE_COFHE_DISABLE_PERSISTED_KEYS')
  if (configured == null) {
    return true
  }
  return configured.toLowerCase() !== 'false'
}

export function createConfiguredCofheClient() {
  const endpoints = resolveCofheEndpoints()
  const supportedArbSepolia = {
    ...chains.arbSepolia,
    ...endpoints,
  }

  const config = createCofheConfig({
    supportedChains: [supportedArbSepolia, chains.hardhat],
    useWorkers: false,
    fheKeyStorage: shouldDisablePersistedFheKeys() ? null : undefined,
  })

  return createCofheClient(config)
}

export function isRecoverableCofheKeyFetchError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return COFHE_FETCH_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
}

export async function recreateFreshCofheClient(currentClient: CofheClient) {
  const { publicClient, walletClient } = currentClient.connection
  if (!publicClient || !walletClient) {
    throw new Error('CoFHE client is not connected to a wallet yet.')
  }

  const freshClient = createConfiguredCofheClient()
  await (freshClient.connect as any)(publicClient, walletClient)
  return freshClient
}

export function formatCofheFetchError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const endpoints = resolveCofheEndpoints()

  return [
    message,
    `CoFHE endpoint: ${endpoints.coFheUrl}`,
    `Verifier endpoint: ${endpoints.verifierUrl}`,
    `Threshold endpoint: ${endpoints.thresholdNetworkUrl}`,
    'If this keeps failing, hard refresh once so the browser drops any stale CoFHE state.',
  ].join(' | ')
}
