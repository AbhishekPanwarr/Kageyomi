import { useEffect, useState } from 'react'
import { usePublicClient, useWalletClient } from 'wagmi'

import type { CofheClient } from '../lib/cofhe'
import { createConfiguredCofheClient } from '../lib/cofheConfig'

export function useCofheClient() {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const [client, setClient] = useState<CofheClient | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!walletClient || !publicClient) {
      setClient(null)
      setIsReady(false)
      setError('Wallet not connected')
      return
    }

    const init = async () => {
      try {
        const cofheClient = createConfiguredCofheClient()
        // SDK 0.5.1 currently brings its own viem types, so connect() needs a narrow cast here
        // even though the runtime objects are compatible.
        await (cofheClient.connect as any)(publicClient, walletClient)

        if (cancelled) return
        setClient(cofheClient)
        setIsReady(true)
        setError(null)
      } catch (initError) {
        if (cancelled) return
        setClient(null)
        setIsReady(false)
        setError(initError instanceof Error ? initError.message : 'Failed to initialize CoFHE')
      }
    }

    void init()

    return () => {
      cancelled = true
    }
  }, [publicClient, walletClient])

  return { client, isReady, error }
}
