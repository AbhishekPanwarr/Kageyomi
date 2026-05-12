import { BrowserRouter, Link, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Bell, Sparkles } from 'lucide-react'

import { HomePage } from './pages/HomePage'
import { InferenceNewPage } from './pages/InferenceNewPage'
import { InferenceStatusPage } from './pages/InferenceStatusPage'
import { Wave3Popup } from './components/Wave3Popup'
import { truncateAddress } from './utils/helpers'

const KAGEYOMI_AGENT_MODE = import.meta.env.VITE_KAGEYOMI_AGENT_MODE === 'true'

function Placeholder({ title, subtitle }: { title: string, subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center text-white">
      <h1 className="mb-3 text-3xl font-bold">{title}</h1>
      <p className="text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">
        {subtitle || "This module is under development for the Wave 3 demo."}
      </p>
    </div>
  )
}

function WalletBadge() {
  const { address, isConnected } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  const injectedConnector = connectors[0]

  if (isConnected && address) {
    return (
      <button
        className="rounded border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-center transition-colors hover:border-emerald-500/40 ml-4"
        onClick={() => disconnect()}
        type="button"
      >
        <span className="font-mono text-sm font-semibold text-emerald-400">{truncateAddress(address)}</span>
      </button>
    )
  }

  return (
    <button
      className="rounded border border-white/20 bg-white px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-200 disabled:opacity-50 ml-4"
      disabled={!injectedConnector || isPending}
      onClick={() => {
        if (injectedConnector) {
          connect({ connector: injectedConnector })
        }
      }}
      type="button"
    >
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}

function Layout() {
  const location = useLocation()
  const isKageyomiResearchRoute = KAGEYOMI_AGENT_MODE && location.pathname.startsWith('/inference')

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/[0.12]">
      <Wave3Popup />

      <div className="flex min-h-screen overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 left-0 right-0 z-40 border-b border-zinc-800 bg-black/50 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
              <div className="flex items-center gap-2">
                <Link className="flex items-center gap-2" to="/">
                  <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold text-xl rounded-sm">
                    {KAGEYOMI_AGENT_MODE ? 'K' : 'B'}
                  </div>
                  <span className="font-semibold text-lg tracking-wide">{KAGEYOMI_AGENT_MODE ? 'KAGEYOMI' : 'BLINDFERENCE'}</span>
                </Link>
              </div>

              <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
                {!KAGEYOMI_AGENT_MODE ? (
                  <>
                    <Link className="hover:text-white transition-colors" to="/">
                      Home
                    </Link>
                    <Link className="hover:text-white transition-colors flex items-center gap-1.5" to="/models">
                      Models
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                    </Link>
                    <Link className="hover:text-white transition-colors flex items-center gap-1.5" to="/nodes">
                      Nodes
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                    </Link>
                    <Link className="hover:text-white transition-colors" to="/coverage">
                      Coverage
                    </Link>
                    <Link className="hover:text-white transition-colors" to="/dashboard">
                      Dashboard
                    </Link>
                  </>
                ) : (
                  <>
                    <Link className="hover:text-white transition-colors" to="/">
                      Home
                    </Link>
                    <Link className="hover:text-white transition-colors" to="/inference/new">
                      Research
                    </Link>
                  </>
                )}
              </nav>

              <div className="flex items-center gap-4">
                {KAGEYOMI_AGENT_MODE ? (
                  <>
                    <span className="hidden rounded-full border border-zinc-700/80 bg-black px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-300 sm:block">
                      KAGEYOMI MODE
                    </span>
                    <button className="relative hidden p-2 text-zinc-400 hover:text-white transition-colors md:block" type="button">
                      <Bell className="w-5 h-5" />
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white border border-black" />
                    </button>
                  </>
                ) : null}
                <WalletBadge />
              </div>
            </div>
          </header>

          <main className="w-full flex-1">
            <Outlet />
          </main>

          {!KAGEYOMI_AGENT_MODE ? (
            <footer className="border-t border-zinc-800 py-12 px-6">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-500">
                <p>© 2026 Blindference.</p>
                <p>Powered by Fhenix CoFHE</p>
              </div>
            </footer>
          ) : isKageyomiResearchRoute ? null : (
            <footer className="border-t border-zinc-800 py-12 px-6">
              <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                <div>
                  <h4 className="font-semibold mb-4 text-white">Product</h4>
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li><a className="hover:text-zinc-300" href="#">Features</a></li>
                    <li><a className="hover:text-zinc-300" href="#">Agents</a></li>
                    <li><a className="hover:text-zinc-300" href="#">Pricing</a></li>
                    <li><a className="hover:text-zinc-300" href="#">API</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-4 text-white">Resources</h4>
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li><a className="hover:text-zinc-300" href="#">Documentation</a></li>
                    <li><a className="hover:text-zinc-300" href="#">GitHub</a></li>
                    <li><a className="hover:text-zinc-300" href="#">Demo</a></li>
                    <li><a className="hover:text-zinc-300" href="#">Blog</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-4 text-white">Company</h4>
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li><a className="hover:text-zinc-300" href="#">About</a></li>
                    <li><a className="hover:text-zinc-300" href="#">Contact</a></li>
                    <li><a className="hover:text-zinc-300" href="#">Careers</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-4 text-white">Legal</h4>
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li><a className="hover:text-zinc-300" href="#">Privacy</a></li>
                    <li><a className="hover:text-zinc-300" href="#">Terms</a></li>
                    <li><a className="hover:text-zinc-300" href="#">Security</a></li>
                  </ul>
                </div>
              </div>
              <div className="max-w-7xl mx-auto pt-8 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-500">
                <p>© 2026 Kageyomi.</p>
                <p>Powered by Blindference × SoSoValue × Reineira</p>
              </div>
            </footer>
          )}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />} path="/">
          <Route element={<HomePage />} index />
          <Route element={<Placeholder title="Model Marketplace" subtitle="This module will be added in upcoming waves." />} path="models" />
          <Route element={<Placeholder title="Network Nodes" subtitle="Node visualization will be added in upcoming waves." />} path="nodes" />
          <Route element={<InferenceNewPage />} path="inference/new" />
          <Route element={<InferenceStatusPage />} path="inference/:requestId" />
          <Route element={<Placeholder title="Inference Coverage" subtitle="Reineira settlement is under development from both blindference and reineira teams mutual side." />} path="coverage" />
          <Route element={<Placeholder title="User Dashboard" />} path="dashboard" />
          <Route element={<Placeholder title="Join the Network" subtitle="Node joining instructions will be added in upcoming waves." />} path="join-node" />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
