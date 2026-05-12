import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  Shield, CheckCircle, Building2, Activity, Newspaper, Landmark,
  Scale, Globe, Network, Settings, Lock, Cpu, BadgeCheck,
  ChevronRight, ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Landing() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/[0.12]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold text-xl rounded-sm">
              K
            </div>
            <span className="font-semibold text-lg tracking-wide">KAGEYOMI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#agents" className="hover:text-white transition-colors">Agents</a>
            <a href="#technology" className="hover:text-white transition-colors">Technology</a>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to="/dashboard" 
              className="px-4 py-2 bg-white hover:bg-zinc-200 text-black text-sm font-medium rounded-lg transition-colors font-semibold"
            >
              Launch Terminal
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden flex flex-col items-center text-center px-6">
          <div className="absolute inset-0 bg-black -z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0,transparent_50%)] -z-10" />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto space-y-8"
          >
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {[
                { label: 'UAVP Verified', icon: BadgeCheck },
                { label: 'SoSoValue Data', icon: Activity },
                { label: 'Blindference Secured', icon: Shield },
                { label: 'Reineira Settled', icon: CheckCircle }
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-zinc-700/80 text-xs text-zinc-300">
                  <badge.icon className="w-3.5 h-3.5 text-zinc-400" />
                  {badge.label}
                </div>
              ))}
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              Confidential Crypto <br className="hidden md:block" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">Intelligence</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto font-light">
              Institutional-grade research agents powered by encrypted inference. Seven specialized AI analysts. One verified truth.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link 
                to="/dashboard" 
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-zinc-200 text-black font-medium rounded-lg transition-all flex items-center justify-center gap-2 hover:gap-3"
              >
                Launch Research Terminal <ArrowRight className="w-4 h-4" />
              </Link>
              <a 
                href="#demo" 
                className="w-full sm:w-auto px-8 py-4 bg-transparent border border-white/20 hover:bg-white/5 text-white font-medium rounded-lg transition-all"
              >
                View Live Demo
              </a>
            </div>
          </motion.div>
        </section>

        {/* Value Proposition */}
        <section id="features" className="py-24 px-6 border-t border-zinc-800 bg-zinc-950">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Research Without Compromise</h2>
              <p className="text-zinc-400 max-w-xl mx-auto">Access tier-1 insights with mathematically guaranteed privacy.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Shield, title: 'Encrypted Inference', desc: 'Your queries never leave your device in plaintext. Processed entirely within secure enclaves.' },
                { icon: BadgeCheck, title: 'UAVP Verified', desc: 'Every insight is cryptographically verified on-chain, ensuring tamper-proof intelligence.' },
                { icon: Building2, title: 'Institutional Data', desc: 'Powered by SoSoValue\'s comprehensive institutional-grade market intelligence.' }
              ].map((feature, i) => (
                <div key={i} className="p-8 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-white/[0.12] transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-white/[0.05] flex items-center justify-center mb-6">
                    <feature.icon className="w-6 h-6 text-zinc-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-zinc-400 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Agent Showcase */}
        <section id="agents" className="py-32 px-6 bg-black">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Seven Specialized Research Agents</h2>
              <p className="text-zinc-400 max-w-2xl text-lg">Each agent is an expert in its domain. Together, they form a complete intelligence apparatus.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Row 1 */}
              <AgentCard icon={Activity} name="FlowSentinel" desc="ETF & Institutional Flow Analyzer" detail="Track BTC/ETH ETF flows and institutional positioning" />
              <AgentCard icon={Newspaper} name="NarrativeScope" desc="Sentiment & News Intelligence" detail="Extract signal from crypto news and social sentiment" />
              <AgentCard icon={Landmark} name="TreasuryRadar" desc="Corporate BTC Accumulation" detail="Monitor public company Bitcoin treasury activity" />
              
              {/* Row 2 */}
              <AgentCard icon={Scale} name="IndexArb" desc="Relative Value Scanner" detail="Identify dislocations between SoSoValue indices" />
              <AgentCard icon={Globe} name="MacroShield" desc="Macro Event Risk Modeler" detail="Model CPI, FOMC, NFP impact on crypto" />
              <AgentCard icon={Network} name="VentureMap" desc="Fundraising & VC Intelligence" detail="Track venture capital deployment" />
            </div>
            
            {/* Row 3 - StrategyForge */}
            <div className="mt-6 md:col-span-3">
              <div className="p-8 rounded-2xl bg-gradient-to-r from-[#141414] to-orange-900/20 border border-white/[0.08] flex flex-col md:flex-row items-start md:items-center gap-6 group hover:-translate-y-1 transition-transform">
                <div className="w-16 h-16 rounded-xl bg-white/[0.08] flex items-center justify-center shrink-0">
                  <Settings className="w-8 h-8 text-zinc-300" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
                    StrategyForge <span className="px-2 py-1 bg-white/[0.08] text-zinc-300 text-xs rounded-md uppercase tracking-wider">Multi-Agent Composer</span>
                  </h3>
                  <p className="text-zinc-400">Synthesize signals from all 6 specialized agents into an actionable, cohesive trading strategy.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 px-6 bg-zinc-950 border-y border-zinc-800">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-16 text-center">Confidential Research in Three Steps</h2>
            
            <div className="relative">
              {/* Line connector */}
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-y-1/2" />
              
              <div className="grid md:grid-cols-3 gap-12 text-center relative pointer-events-none">
                {[
                  { icon: Lock, step: 'Step 1 - Encrypt', desc: 'Encrypt your query client-side before it leaves your device' },
                  { icon: Cpu, step: 'Step 2 - Process', desc: 'Agents analyze via encrypted inference without decrypting' },
                  { icon: Shield, step: 'Step 3 - Verify', desc: 'Receive verified output and decrypt locally' }
                ].map((step, i) => (
                  <div key={i} className="relative z-10 flex flex-col items-center pointer-events-auto">
                    <div className="w-20 h-20 rounded-2xl bg-black border border-zinc-700/80 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                      <step.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-zinc-400 font-mono text-sm tracking-widest mb-2">{step.step}</div>
                    <p className="text-zinc-300 font-medium">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-32 px-6 bg-gradient-to-b from-[#0a0a0a] to-[#000000]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Research Confidentially?</h2>
            <p className="text-xl text-zinc-400 mb-10">Join the first wave of confidential crypto intelligence.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/dashboard" className="px-8 py-4 bg-white hover:bg-zinc-200 text-black font-medium rounded-lg transition-colors">
                Launch Terminal
              </Link>
              <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors border border-zinc-700/80">
                Read Documentation
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="font-semibold mb-4 text-white">Product</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li><a href="#" className="hover:text-zinc-300">Features</a></li>
              <li><a href="#" className="hover:text-zinc-300">Agents</a></li>
              <li><a href="#" className="hover:text-zinc-300">Pricing</a></li>
              <li><a href="#" className="hover:text-zinc-300">API</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-white">Resources</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li><a href="#" className="hover:text-zinc-300">Documentation</a></li>
              <li><a href="#" className="hover:text-zinc-300">GitHub</a></li>
              <li><a href="#" className="hover:text-zinc-300">Demo</a></li>
              <li><a href="#" className="hover:text-zinc-300">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-white">Company</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li><a href="#" className="hover:text-zinc-300">About</a></li>
              <li><a href="#" className="hover:text-zinc-300">Contact</a></li>
              <li><a href="#" className="hover:text-zinc-300">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-white">Legal</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li><a href="#" className="hover:text-zinc-300">Privacy</a></li>
              <li><a href="#" className="hover:text-zinc-300">Terms</a></li>
              <li><a href="#" className="hover:text-zinc-300">Security</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-500">
          <p>© 2026 Kageyomi.</p>
          <p>Powered by Blindference × SoSoValue × Reineira</p>
        </div>
      </footer>
    </div>
  );
}

function AgentCard({ icon: Icon, name, desc, detail }: { icon: any, name: string, desc: string, detail: string }) {
  return (
    <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:-translate-y-1 transition-transform group">
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-white/[0.05] transition-colors">
        <Icon className="w-6 h-6 text-zinc-300 group-hover:text-zinc-300 transition-colors" />
      </div>
      <h3 className="text-xl font-bold mb-1 text-white">{name}</h3>
      <div className="text-sm text-zinc-300 font-medium mb-3">{desc}</div>
      <p className="text-zinc-400 text-sm leading-relaxed">{detail}</p>
    </div>
  );
}
