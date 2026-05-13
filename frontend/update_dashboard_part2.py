import re

with open('/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/frontend/src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# 1. Add activeQuery, history, activeTab, configs
state_injections = """
  const [activeQuery, setActiveQuery] = useState('');
  const [agentConfig, setAgentConfig] = useState('latest');
  const [showAgentConfig, setShowAgentConfig] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeFiled, setDisputeFiled] = useState(false);
  const [history, setHistory] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('kageyomi_history') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('kageyomi_history', JSON.stringify(history));
  }, [history]);
"""

content = content.replace("const [isDecrypting, setIsDecrypting] = useState(false);", "const [isDecrypting, setIsDecrypting] = useState(false);\n" + state_injections)

# 2. Modify handleSubmit to use activeQuery and agentConfig
handleSubmit_mod = """
  const handleSubmit = async () => {
    let finalPrompt = prompt.trim();
    if (!finalPrompt) return;
    setActiveQuery(finalPrompt);

    // Save to history
    setHistory(prev => [{ prompt: finalPrompt, agent: selectedAgent, config: agentConfig, date: new Date().toISOString() }, ...prev]);

    if (selectedAgent === 'FlowSentinel') finalPrompt += ' Focus on institutional flows.';
    if (selectedAgent === 'NarrativeScope') finalPrompt += ' Focus on sentiment and news.';
    if (selectedAgent === 'TreasuryRadar') finalPrompt += ' Focus on corporate BTC accumulation.';
    if (selectedAgent === 'FullGraph') finalPrompt += ' Use all available agents for a comprehensive graph analysis.';

    if (agentConfig === 'latest') finalPrompt += ' Provide the latest target data.';
    if (agentConfig === 'historical') finalPrompt += ' Provide historical context.';
"""

content = re.sub(r'const handleSubmit = async \(\) => \{[\s\S]*?if \(selectedAgent === \'FlowSentinel\'\) finalPrompt \+= \' Focus on institutional flows\.\';', handleSubmit_mod + "\n    if (selectedAgent === 'FlowSentinel') finalPrompt += ' Focus on institutional flows.';", content)

# 3. Update activeQuery display
content = content.replace('"Analyze BTC institutional flows ahead of CPI"', '"{activeQuery}"')

# 4. Add FullGraph to agents
agents_html = """
                    <div onClick={() => setSelectedAgent('FullGraph')} className={selectedAgent === 'FullGraph' ? 'ring-2 ring-emerald-500 rounded-xl' : ''}>
                      <SmallAgentCard icon={Network} name="FullGraph (Auto)" stat="All 7 Agents" sparkline={sparklineData} />
                    </div>
                    <div onClick={() => setSelectedAgent('FlowSentinel')} className={selectedAgent === 'FlowSentinel' ? 'ring-2 ring-emerald-500 rounded-xl' : ''}>
"""
content = content.replace("<div onClick={() => setSelectedAgent('FlowSentinel')} className={selectedAgent === 'FlowSentinel' ? 'ring-2 ring-emerald-500 rounded-xl' : ''}>", agents_html)

# 5. Agent Configuration UI
config_html = """
                      <div className="relative">
                        <button onClick={() => setShowAgentConfig(!showAgentConfig)} className="text-zinc-400 text-sm hover:text-white flex items-center gap-1">
                          <Settings className="w-4 h-4" /> Config: {agentConfig === 'latest' ? 'Latest Target' : 'Historical Data'}
                        </button>
                        {showAgentConfig && (
                          <div className="absolute top-full left-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 p-2 flex flex-col gap-1">
                            <button onClick={() => { setAgentConfig('latest'); setShowAgentConfig(false); }} className={`text-left px-3 py-2 text-sm rounded ${agentConfig === 'latest' ? 'bg-emerald-500/10 text-emerald-500' : 'text-zinc-300 hover:bg-zinc-800'}`}>Latest Target</button>
                            <button onClick={() => { setAgentConfig('historical'); setShowAgentConfig(false); }} className={`text-left px-3 py-2 text-sm rounded ${agentConfig === 'historical' ? 'bg-emerald-500/10 text-emerald-500' : 'text-zinc-300 hover:bg-zinc-800'}`}>Historical Data</button>
                          </div>
                        )}
                      </div>
"""
content = re.sub(r'<button className="text-zinc-400 text-sm hover:text-white flex items-center gap-1">\s*<Settings className="w-4 h-4" /> Agent Configuration\s*</button>', config_html, content)

# 6. Sidebar active states and clicks
sidebar_original = """
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <NavItem icon={Home} label="Home" active />
          <NavItem icon={FlaskConical} label="Research" />
          <NavItem icon={Bot} label="Agents" badge="7 Active" />
          <NavItem icon={Clock} label="History" />
          <NavItem icon={LineChart} label="Portfolio" />
          <NavItem icon={Settings} label="Settings" />
        </div>
"""

sidebar_new = """
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div onClick={() => setActiveTab('Home')}><NavItem icon={Home} label="Home" active={activeTab === 'Home'} /></div>
          <div onClick={() => setActiveTab('Agents')}><NavItem icon={Bot} label="Agents" badge="7 Active" active={activeTab === 'Agents'} /></div>
          <div onClick={() => setActiveTab('History')}><NavItem icon={Clock} label="History" active={activeTab === 'History'} /></div>
          <div onClick={() => setActiveTab('Portfolio')}><NavItem icon={LineChart} label="Portfolio" active={activeTab === 'Portfolio'} /></div>
          <div onClick={() => setActiveTab('Settings')}><NavItem icon={Settings} label="Settings" active={activeTab === 'Settings'} /></div>
        </div>
"""
content = content.replace(sidebar_original, sidebar_new)

# 7. Add Dispute Modal
dispute_html = """
      <AnimatePresence>
        {showDisputeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold mb-4">File a Dispute</h2>
              {!disputeFiled ? (
                <>
                  <p className="text-sm text-zinc-400 mb-6">If you believe the agent hallucinations or execution was faulty, you can file a dispute.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowDisputeModal(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg">Cancel</button>
                    <button onClick={() => { setDisputeFiled(true); }} className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg">File Dispute</button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <p className="text-sm text-zinc-300">Your dispute has been recorded. It will be checked within 72 hours and once confirmed you will receive your money back.</p>
                  <button onClick={() => { setShowDisputeModal(false); setDisputeFiled(false); }} className="mt-6 px-6 py-2 bg-white text-black rounded-lg">Close</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
"""
content = content.replace("{/* Decrypt Modal Overlay */}", dispute_html + "\n      {/* Decrypt Modal Overlay */}")

# 8. Add Dispute Button in completed results
dispute_btn = """
                        {/* StrategyForge Synthesis */}
                        <div className="flex justify-end mb-4">
                          <button onClick={() => setShowDisputeModal(true)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 border border-red-500/20 px-3 py-1.5 rounded bg-red-500/5 transition-colors">
                            <AlertTriangle className="w-3.5 h-3.5" /> File a Dispute
                          </button>
                        </div>
                        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl">
"""
content = content.replace('<div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl">', dispute_btn)

# 9. Implement Tab Views
main_view = """
            {/* Conditional Rendering based on state */}
            {activeTab === 'Portfolio' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <LineChart className="w-16 h-16 text-zinc-600 mx-auto" />
                  <h2 className="text-2xl font-bold">Portfolio</h2>
                  <p className="text-zinc-500">Coming soon for further waves.</p>
                </div>
              </div>
            ) : activeTab === 'Settings' ? (
              <div className="max-w-2xl mx-auto space-y-6 pt-10">
                <h2 className="text-2xl font-bold border-b border-zinc-800 pb-4">Account Settings</h2>
                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Wallet Address</label>
                    <div className="font-mono text-zinc-300 bg-black p-3 rounded border border-zinc-800">{address || 'Not connected'}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Network</label>
                    <div className="text-zinc-300">Fhenix Helium Network</div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'History' ? (
              <div className="max-w-4xl mx-auto space-y-6 pt-10">
                <h2 className="text-2xl font-bold border-b border-zinc-800 pb-4">Inference History</h2>
                {history.length === 0 ? (
                  <p className="text-zinc-500 text-center py-10">No history available.</p>
                ) : (
                  <div className="space-y-4">
                    {history.map((h, i) => (
                      <div key={i} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-emerald-500 font-bold uppercase">{h.agent}</span>
                          <span className="text-xs text-zinc-600">{new Date(h.date).toLocaleString()}</span>
                        </div>
                        <p className="text-zinc-300 text-sm">"{h.prompt}"</p>
                        <div className="mt-3 text-xs text-zinc-500">Config: {h.config}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'Agents' ? (
              <div className="max-w-5xl mx-auto space-y-6 pt-10">
                <h2 className="text-2xl font-bold border-b border-zinc-800 pb-4">Active Agents Details</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2"><Activity className="w-5 h-5 text-emerald-500" /> FlowSentinel</h3>
                    <p className="text-sm text-zinc-400">Tracks institutional inflows and ETF positioning. Best used to identify smart money accumulation.</p>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2"><Newspaper className="w-5 h-5 text-emerald-500" /> NarrativeScope</h3>
                    <p className="text-sm text-zinc-400">Sentiment analysis engine reading social and news media to gauge market momentum.</p>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2"><Landmark className="w-5 h-5 text-emerald-500" /> TreasuryRadar</h3>
                    <p className="text-sm text-zinc-400">Monitors public companies adding BTC to their balance sheets.</p>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2"><Network className="w-5 h-5 text-emerald-500" /> FullGraph Auto Composer</h3>
                    <p className="text-sm text-zinc-400">Synthesizes data across all 7 specialized agents into a unified strategic outlook.</p>
                  </div>
                </div>
              </div>
            ) : queryStatus === 'idle' ? (
"""

content = content.replace("{/* Conditional Rendering based on state */}\n            {queryStatus === 'idle' ? (", main_view)

with open('/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/frontend/src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
