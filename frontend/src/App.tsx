import { BrowserRouter, Link, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Bell, Home, Search, Bot, History, Briefcase, Settings, BookOpen, MessageSquare, ChevronRight } from 'lucide-react'

import { HomePage } from './pages/HomePage'
import { InferenceNewPage } from './pages/InferenceNewPage'
import { InferenceStatusPage } from './pages/InferenceStatusPage'
import { AgentsPage } from './pages/AgentsPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { Wave3Popup } from './components/Wave3Popup'
import { truncateAddress } from './utils/helpers'

const KAGEYOMI_AGENT_MODE = import.meta.env.VITE_KAGEYOMI_AGENT_MODE === 'true'

function Placeholder({ title, subtitle }: { title: string, subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center text-white">
      <h1 className="mb-3 text-3xl font-bold">{title}</h1>
      <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
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
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-center transition-colors hover:border-zinc-600 hover:bg-zinc-800"
        onClick={() => disconnect()}
        type="button"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
        <span className="font-mono text-xs font-semibold text-zinc-200">{truncateAddress(address)}</span>
      </button>
    )
  }

  return (
    <button
      className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-50"
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

// Sidebar nav item for Kageyomi mode
function SideNavItem({ to, icon: Icon, label, badge }: { to: string; icon: any; label: string; badge?: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-zinc-800 text-white font-medium'
            : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
        }`
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300 uppercase tracking-wide">
          {badge}
        </span>
      )}
    </NavLink>
  )
}

function KageyomiSidebar() {
  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-[#0d0d0d] h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800">
        <img
          alt="Kageyomi"
          className="h-10 w-auto object-contain shrink-0"
          src="/kageyomi-logo.jpeg"
        />
        <span className="font-semibold text-sm tracking-[0.28em] text-white">
          KAGEYOMI
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-4 overflow-y-auto">
        <SideNavItem to="/" icon={Home} label="Home" />
        <SideNavItem to="/inference/new" icon={Search} label="Research" />
        <SideNavItem to="/agents" icon={Bot} label="Agents" badge="7 ACTIVE" />
        <SideNavItem to="/history" icon={History} label="History" />
        <SideNavItem to="/portfolio" icon={Briefcase} label="Portfolio" />
        <SideNavItem to="/settings" icon={Settings} label="Settings" />
      </nav>

      {/* Bottom */}
      <div className="border-t border-zinc-800 px-2 py-4 space-y-0.5">
        <SideNavItem to="/docs" icon={BookOpen} label="Documentation" />
        <SideNavItem to="/support" icon={MessageSquare} label="Support" />
        <div className="mt-3 px-2 py-2 text-[10px] text-zinc-600">v1.0.0-beta</div>
      </div>
    </aside>
  )
}

function KageyomiHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-800 bg-[#0d0d0d]/90 backdrop-blur-md px-6">
      <div className="flex items-center gap-4 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Agent Mesh: 7 Live
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          SoSoValue: Live
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
          Fhenix CoFHE: Active
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors" type="button">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-zinc-300 border border-[#0d0d0d]" />
        </button>
        <WalletBadge />
      </div>
    </header>
  )
}

function KageyomiLayout() {
  return (
    <div className="flex min-h-screen bg-[#111111] text-white">
      <Wave3Popup />
      <KageyomiSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <KageyomiHeader />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function PublicLayout() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/[0.12]">
      <Wave3Popup />
      <div className="flex min-h-screen overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 left-0 right-0 z-40 border-b border-zinc-800 bg-black/50 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
              <div className="flex items-center gap-2">
                <Link className="flex items-center gap-2" to="/">
                  <img
                    alt="Kageyomi"
                    className="h-9 w-auto object-contain shrink-0"
                    src="/kageyomi-logo.jpeg"
                  />
                  <span className="font-semibold text-lg tracking-[0.26em] text-white">
                    KAGEYOMI
                  </span>
                </Link>
              </div>
              <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
                <Link className="hover:text-white transition-colors" to="/">Home</Link>
                <Link className="hover:text-white transition-colors" to="/models">Models</Link>
                <Link className="hover:text-white transition-colors" to="/nodes">Nodes</Link>
                <Link className="hover:text-white transition-colors" to="/coverage">Coverage</Link>
                <Link className="hover:text-white transition-colors" to="/dashboard">Dashboard</Link>
              </nav>
              <WalletBadge />
            </div>
          </header>
          <main className="w-full flex-1">
            <Outlet />
          </main>
          <footer className="border-t border-zinc-800 py-12 px-6">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-500">
              <p>© 2026 Kageyomi.</p>
              <p>Powered by Fhenix CoFHE</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {KAGEYOMI_AGENT_MODE ? (
          <Route element={<KageyomiLayout />} path="/">
            <Route element={<HomePage />} index />
            <Route element={<InferenceNewPage />} path="inference/new" />
            <Route element={<InferenceStatusPage />} path="inference/:requestId" />
            <Route element={<AgentsPage />} path="agents" />
            <Route element={<HistoryPage />} path="history" />
            <Route element={<Placeholder title="Portfolio" subtitle="Under build for upcoming waves." />} path="portfolio" />
            <Route element={<SettingsPage />} path="settings" />
            <Route element={<Placeholder title="Documentation" />} path="docs" />
            <Route element={<Placeholder title="Support" />} path="support" />
          </Route>
        ) : (
          <Route element={<PublicLayout />} path="/">
            <Route element={<HomePage />} index />
            <Route element={<Placeholder title="Model Marketplace" subtitle="This module will be added in upcoming waves." />} path="models" />
            <Route element={<Placeholder title="Network Nodes" subtitle="Node visualization will be added in upcoming waves." />} path="nodes" />
            <Route element={<InferenceNewPage />} path="inference/new" />
            <Route element={<InferenceStatusPage />} path="inference/:requestId" />
            <Route element={<Placeholder title="Inference Coverage" subtitle="Reineira settlement is under development." />} path="coverage" />
            <Route element={<Placeholder title="User Dashboard" />} path="dashboard" />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  )
}
