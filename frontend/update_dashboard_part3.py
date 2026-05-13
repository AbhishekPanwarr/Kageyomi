import re

with open('/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/frontend/src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# 1. Real-time timestamps and dynamic data for Sidebar
state_injections = """
  const [submissionTime, setSubmissionTime] = useState<Date | null>(null);
  const [leaderAddr, setLeaderAddr] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
"""
content = content.replace("const [isDecrypting, setIsDecrypting] = useState(false);", "const [isDecrypting, setIsDecrypting] = useState(false);\n" + state_injections)

# In handleSubmit, set submissionTime and leaderAddr
handleSubmit_mod = """
      setQueryStatus('processing');
      setSubmissionTime(new Date());
"""
content = content.replace("setQueryStatus('processing');", handleSubmit_mod, 1)

leader_assign_mod = """
      const quorumPreview = await inferenceApi.getQuorumPreview({
        model_id: 'groq:llama-3.3-70b-versatile',
        min_tier: 1, verifier_count: 2, zdr_required: false,
      });
      setLeaderAddr(quorumPreview.data.leader);
"""
content = content.replace("""const quorumPreview = await inferenceApi.getQuorumPreview({
        model_id: 'groq:llama-3.3-70b-versatile',
        min_tier: 1, verifier_count: 2, zdr_required: false,
      });""", leader_assign_mod)

# Update sidebar Timeline items
timeline_old = """                  <TimelineItem 
                    status="success" 
                    title="Query Encrypted" 
                    time="3:28:01 PM" 
                  />
                  
                  <TimelineItem 
                    status={queryStatus !== 'idle' ? 'success' : 'pending'} 
                    title="Agents Assigned" 
                    desc={queryStatus !== 'idle' ? "Leader: 0x9Cc0...bB3E" : ""} 
                  />
                  
                  <TimelineItem 
                    status={queryStatus === 'processing' ? 'active' : queryStatus === 'verifying' || queryStatus === 'completed' ? 'success' : 'pending'} 
                    title="Enclave Execution" 
                    desc={queryStatus !== 'idle' ? "6/7 agents complete" : ""} 
                  />
                  
                  <TimelineItem 
                    status={queryStatus === 'verifying' ? 'active' : queryStatus === 'completed' ? 'success' : 'pending'} 
                    title="Quorum Verification" 
                    desc="Fhenix network consensus" 
                  />
                  
                  <TimelineItem 
                    status={queryStatus === 'completed' ? 'success' : 'pending'} 
                    title="On-Chain Commitment" 
                    desc={queryStatus === 'completed' ? "Tx: 0x4f...a1c" : ""} 
                  />"""

timeline_new = """                  <TimelineItem 
                    status={queryStatus !== 'idle' ? 'success' : 'pending'} 
                    title="Query Encrypted" 
                    time={submissionTime ? submissionTime.toLocaleTimeString() : undefined} 
                  />
                  
                  <TimelineItem 
                    status={queryStatus !== 'idle' ? 'success' : 'pending'} 
                    title="Agents Assigned" 
                    desc={leaderAddr ? `Leader: ${leaderAddr.slice(0,6)}...${leaderAddr.slice(-4)}` : ""} 
                  />
                  
                  <TimelineItem 
                    status={queryStatus === 'processing' ? 'active' : queryStatus === 'verifying' || queryStatus === 'completed' ? 'success' : 'pending'} 
                    title="Enclave Execution" 
                    desc={queryStatus !== 'idle' ? "Running agent graph" : ""} 
                  />
                  
                  <TimelineItem 
                    status={queryStatus === 'verifying' ? 'active' : queryStatus === 'completed' ? 'success' : 'pending'} 
                    title="Quorum Verification" 
                    desc="Fhenix network consensus" 
                  />
                  
                  <TimelineItem 
                    status={queryStatus === 'completed' ? 'success' : 'pending'} 
                    title="Result Verified" 
                    desc={status?.text_result?.output_cid ? `CID: ${status.text_result.output_cid.slice(0, 8)}...` : ""} 
                  />"""
content = content.replace(timeline_old, timeline_new)

# 2. Fix the header hardcoded data (time, verified, 6/7 agents)
header_old = """                  <div className="flex flex-wrap gap-6 text-sm">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Clock3 className="w-4 h-4" /> <span>May 12, 2026 3:28 PM UTC</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-300">
                      <ShieldCheck className="w-4 h-4" /> <span>Verified on Fhenix</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Bot className="w-4 h-4" /> <span>6/7 agents aligned</span>
                    </div>
                  </div>"""

header_new = """                  <div className="flex flex-wrap gap-6 text-sm">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Clock3 className="w-4 h-4" /> <span>{submissionTime ? submissionTime.toLocaleString() : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-300">
                      <ShieldCheck className="w-4 h-4" /> <span>{queryStatus === 'completed' ? 'Verified on Fhenix' : 'Pending Verification'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Bot className="w-4 h-4" /> <span>{selectedAgent === 'FullGraph' ? 'Auto Composer Active' : selectedAgent + ' Active'}</span>
                    </div>
                  </div>"""
content = content.replace(header_old, header_new)

# 3. Dynamic Results View
# Instead of hardcoded strategy forge, render the textAnswer correctly if decrypted.
# If textAnswer has markdown or formatting, just format it nicely.
results_old = """                        {/* StrategyForge Synthesis */}
                        <div className="flex justify-end mb-4">
                          <button onClick={() => setShowDisputeModal(true)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 border border-red-500/20 px-3 py-1.5 rounded bg-red-500/5 transition-colors">
                            <AlertTriangle className="w-3.5 h-3.5" /> File a Dispute
                          </button>
                        </div>
                        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="bg-white/[0.08] p-2 rounded-lg">
                              <Settings className="w-5 h-5 text-zinc-400" />
                            </div>
                            <h3 className="text-xl font-semibold">StrategyForge Synthesis</h3>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                              <div>
                                <div className="text-sm text-zinc-500 mb-1">Recommendation</div>
                                <div className="text-2xl font-bold text-zinc-300">BUY (Asymmetric Target)</div>
                              </div>
                              <div>
                                <div className="text-sm text-zinc-500 mb-2">Conviction Score</div>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
                                    <div className="h-full bg-white w-[79%]" />
                                  </div>
                                  <span className="font-mono font-medium">79%</span>
                                </div>
                              </div>
                              <div className="bg-zinc-950 rounded-lg p-4 font-mono text-sm space-y-2 border border-zinc-800">
                                <div className="flex justify-between">
                                  <span className="text-zinc-500">Entry Zone:</span>
                                  <span className="text-white">$63,800 - $65,200</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500">Stop Loss:</span>
                                  <span className="text-white">$61,500</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500">Target 1:</span>
                                  <span className="text-zinc-300">$71,000 (+9.2%)</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <h4 className="font-medium text-zinc-300">Thesis Summary</h4>
                              <p className="text-sm text-zinc-400 leading-relaxed">
                                5 out of 6 active agents are aligned bullish. Strong institutional flow divergence (FlowSentinel) combined with a solid corporate accumulation floor (TreasuryRadar) suggests immediate structural bid below $65K. Macro Shield recommends a minor size reduction (-15%) due to proximity to FOMC, but overall setup maintains high expected value.
                              </p>
                              
                              <h4 className="font-medium text-zinc-300 pt-2">Agent Alignment</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-zinc-300">● FlowSentinel</span> <span className="text-zinc-400">Bullish divergence</span></div>
                                <div className="flex justify-between"><span className="text-zinc-300">● NarrativeScope</span> <span className="text-zinc-400">Sentiment leading</span></div>
                                <div className="flex justify-between"><span className="text-zinc-300">● TreasuryRadar</span> <span className="text-zinc-400">Accumulation floor</span></div>
                                <div className="flex justify-between"><span className="text-amber-500">● MacroShield</span> <span className="text-zinc-400">Neutral/Risk-off</span></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Agent Tabs */}
                        <div className="border-b border-zinc-800 flex gap-6 overflow-x-auto pb-2 scrollbar-hide">
                          <button className="text-zinc-300 border-b-2 border-zinc-700 pb-2 text-sm font-medium whitespace-nowrap">FlowSentinel Details</button>
                          <button className="text-zinc-500 hover:text-zinc-300 pb-2 text-sm font-medium whitespace-nowrap">MacroShield Details</button>
                          <button className="text-zinc-500 hover:text-zinc-300 pb-2 text-sm font-medium whitespace-nowrap">Raw Data (JSON)</button>
                        </div>
                        
                        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 font-mono text-sm text-zinc-300 leading-relaxed">
                          {textAnswer || 'Loading...'}
                        </div>"""

results_new = """                        <div className="flex justify-end mb-4">
                          <button onClick={() => setShowDisputeModal(true)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 border border-red-500/20 px-3 py-1.5 rounded bg-red-500/5 transition-colors">
                            <AlertTriangle className="w-3.5 h-3.5" /> File a Dispute
                          </button>
                        </div>
                        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="bg-white/[0.08] p-2 rounded-lg">
                              <Settings className="w-5 h-5 text-zinc-400" />
                            </div>
                            <h3 className="text-xl font-semibold">Decrypted Agent Output</h3>
                          </div>
                          <div className="bg-zinc-950 rounded-xl p-6 border border-zinc-800 text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto font-sans">
                            {textAnswer ? textAnswer : 'Loading decrypted data...'}
                          </div>
                        </div>"""
content = content.replace(results_old, results_new)

# 4. Use UAVP details properly
uavp_old = """                  <div className="space-y-3 font-mono text-xs">
                    <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 flex justify-between items-center group">
                      <div>
                        <div className="text-zinc-600 mb-1">Receipt Root</div>
                        <div className="text-zinc-300">0x7a3b...c91d</div>
                      </div>
                      <Copy className="w-4 h-4 text-zinc-600 group-hover:text-white cursor-pointer" />
                    </div>
                    <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 flex justify-between items-center group">
                      <div>
                        <div className="text-zinc-600 mb-1">IPFS CID</div>
                        <div className="text-zinc-400">QmX9z...2pKv</div>
                      </div>
                      <Copy className="w-4 h-4 text-zinc-600 group-hover:text-white cursor-pointer" />
                    </div>
                  </div>"""

uavp_new = """                  <div className="space-y-3 font-mono text-xs">
                    <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 flex justify-between items-center group">
                      <div>
                        <div className="text-zinc-600 mb-1">Trace Hash</div>
                        <div className="text-zinc-300">{status?.uavp_metadata?.trace_hash ? status.uavp_metadata.trace_hash.slice(0, 16) + '...' : 'Pending...'}</div>
                      </div>
                      <Copy className="w-4 h-4 text-zinc-600 group-hover:text-white cursor-pointer" />
                    </div>
                    <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 flex justify-between items-center group">
                      <div>
                        <div className="text-zinc-600 mb-1">Receipts CID</div>
                        <div className="text-zinc-400">{status?.uavp_metadata?.receipts_cid ? status.uavp_metadata.receipts_cid.slice(0, 16) + '...' : 'Pending...'}</div>
                      </div>
                      <Copy className="w-4 h-4 text-zinc-600 group-hover:text-white cursor-pointer" />
                    </div>
                  </div>"""
content = content.replace(uavp_old, uavp_new)

with open('/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/frontend/src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
