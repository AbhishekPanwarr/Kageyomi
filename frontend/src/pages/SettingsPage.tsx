import { useAccount, useDisconnect, useConnect } from 'wagmi'
import { LogOut, Wallet } from 'lucide-react'

export function SettingsPage() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { connectors, connect, isPending } = useConnect()
  const injectedConnector = connectors[0]

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-medium text-white tracking-tight">Settings</h1>
      <p className="text-sm text-zinc-500 mb-8">Manage your wallet and account preferences.</p>
      
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-zinc-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Connected Wallet</h2>
            <p className="text-xs text-zinc-500">Your Web3 identity for private research access</p>
          </div>
        </div>

        {isConnected && address ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Address</div>
              <div className="font-mono text-sm text-white break-all">{address}</div>
            </div>
            
            <button
              onClick={() => disconnect()}
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Disconnect Wallet
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-zinc-400 mb-4">No wallet connected.</p>
            <button
              disabled={!injectedConnector || isPending}
              onClick={() => injectedConnector && connect({ connector: injectedConnector })}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              <Wallet className="w-4 h-4" />
              {isPending ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
