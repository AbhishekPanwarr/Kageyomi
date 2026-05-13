import re

with open('/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/frontend/src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# 1. Update selection rings and icon colors from emerald-500 to zinc-300/zinc-400
content = content.replace("ring-emerald-500", "ring-zinc-400")
content = content.replace("text-emerald-500", "text-zinc-300")
content = content.replace("bg-emerald-500/10 text-emerald-500", "bg-zinc-800 text-white")

# 2. Add IndexArb, MacroShield, VentureMap to Agent Selection Grid
agents_html_old = """                    <div onClick={() => setSelectedAgent('FullGraph')} className={selectedAgent === 'FullGraph' ? 'ring-2 ring-zinc-400 rounded-xl' : ''}>
                      <SmallAgentCard icon={Network} name="FullGraph (Auto)" stat="All 7 Agents" sparkline={sparklineData} />
                    </div>
                    <div onClick={() => setSelectedAgent('FlowSentinel')} className={selectedAgent === 'FlowSentinel' ? 'ring-2 ring-zinc-400 rounded-xl' : ''}>
                      <SmallAgentCard icon={Activity} name="FlowSentinel" stat="+$1.2B inflow (7d)" sparkline={sparklineData} />
                    </div>
                    <div onClick={() => setSelectedAgent('NarrativeScope')} className={selectedAgent === 'NarrativeScope' ? 'ring-2 ring-zinc-400 rounded-xl' : ''}>
                      <SmallAgentCard icon={Newspaper} name="NarrativeScope" stat="+0.76 bullish" sparkline={sparklineData} />
                    </div>
                    <div onClick={() => setSelectedAgent('TreasuryRadar')} className={selectedAgent === 'TreasuryRadar' ? 'ring-2 ring-zinc-400 rounded-xl' : ''}>
                      <SmallAgentCard icon={Landmark} name="TreasuryRadar" stat="MSTR: +3,015 BTC" sparkline={sparklineData} />
                    </div>"""

agents_html_new = """                    <div onClick={() => setSelectedAgent('FullGraph')} className={selectedAgent === 'FullGraph' ? 'ring-2 ring-zinc-400 rounded-xl' : ''}>
                      <SmallAgentCard icon={Network} name="FullGraph (Auto)" stat="All 7 Agents" sparkline={sparklineData} />
                    </div>
                    <div onClick={() => setSelectedAgent('FlowSentinel')} className={selectedAgent === 'FlowSentinel' ? 'ring-2 ring-zinc-400 rounded-xl' : ''}>
                      <SmallAgentCard icon={Activity} name="FlowSentinel" stat="+$1.2B inflow (7d)" sparkline={sparklineData} />
                    </div>
                    <div onClick={() => setSelectedAgent('NarrativeScope')} className={selectedAgent === 'NarrativeScope' ? 'ring-2 ring-zinc-400 rounded-xl' : ''}>
                      <SmallAgentCard icon={Newspaper} name="NarrativeScope" stat="+0.76 bullish" sparkline={sparklineData} />
                    </div>
                    <div onClick={() => setSelectedAgent('TreasuryRadar')} className={selectedAgent === 'TreasuryRadar' ? 'ring-2 ring-zinc-400 rounded-xl' : ''}>
                      <SmallAgentCard icon={Landmark} name="TreasuryRadar" stat="MSTR: +3,015 BTC" sparkline={sparklineData} />
                    </div>
                    <div onClick={() => setSelectedAgent('IndexArb')} className={selectedAgent === 'IndexArb' ? 'ring-2 ring-zinc-400 rounded-xl' : ''}>
                      <SmallAgentCard icon={Scale} name="IndexArb" stat="Relative Value" sparkline={sparklineData} />
                    </div>
                    <div onClick={() => setSelectedAgent('MacroShield')} className={selectedAgent === 'MacroShield' ? 'ring-2 ring-zinc-400 rounded-xl' : ''}>
                      <SmallAgentCard icon={Globe} name="MacroShield" stat="Risk Monitor" sparkline={sparklineData} />
                    </div>
                    <div onClick={() => setSelectedAgent('VentureMap')} className={selectedAgent === 'VentureMap' ? 'ring-2 ring-zinc-400 rounded-xl' : ''}>
                      <SmallAgentCard icon={Home} name="VentureMap" stat="Fundraising Data" sparkline={sparklineData} />
                    </div>"""
content = content.replace(agents_html_old, agents_html_new)

# 3. Handle prompt additions for new agents in handleSubmit
submit_old = """    if (selectedAgent === 'FlowSentinel') finalPrompt += ' Focus on institutional flows.';
    if (selectedAgent === 'NarrativeScope') finalPrompt += ' Focus on sentiment and news.';
    if (selectedAgent === 'TreasuryRadar') finalPrompt += ' Focus on corporate BTC accumulation.';
    if (selectedAgent === 'FullGraph') finalPrompt += ' Use all available agents for a comprehensive graph analysis.';"""

submit_new = """    if (selectedAgent === 'FlowSentinel') finalPrompt += ' Focus on institutional flows.';
    if (selectedAgent === 'NarrativeScope') finalPrompt += ' Focus on sentiment and news.';
    if (selectedAgent === 'TreasuryRadar') finalPrompt += ' Focus on corporate BTC accumulation.';
    if (selectedAgent === 'IndexArb') finalPrompt += ' Focus on relative-value and index performance bias.';
    if (selectedAgent === 'MacroShield') finalPrompt += ' Focus on macro surprise and risk level.';
    if (selectedAgent === 'VentureMap') finalPrompt += ' Focus on fundraising activity overview.';
    if (selectedAgent === 'FullGraph') finalPrompt += ' Use all available agents for a comprehensive graph analysis.';"""
content = content.replace(submit_old, submit_new)

# 4. Add IndexArb, MacroShield, VentureMap to Agents Tab
details_old = """                  <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2"><Network className="w-5 h-5 text-zinc-300" /> FullGraph Auto Composer</h3>
                    <p className="text-sm text-zinc-400">Synthesizes data across all 7 specialized agents into a unified strategic outlook.</p>
                  </div>"""

details_new = """                  <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2"><Network className="w-5 h-5 text-zinc-300" /> FullGraph Auto Composer</h3>
                    <p className="text-sm text-zinc-400">Synthesizes data across all 7 specialized agents into a unified strategic outlook.</p>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2"><Scale className="w-5 h-5 text-zinc-300" /> IndexArb</h3>
                    <p className="text-sm text-zinc-400">Tracks relative-value and index performance bias.</p>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2"><Globe className="w-5 h-5 text-zinc-300" /> MacroShield</h3>
                    <p className="text-sm text-zinc-400">Tracks macro surprises and monitors risk level events.</p>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2"><Home className="w-5 h-5 text-zinc-300" /> VentureMap</h3>
                    <p className="text-sm text-zinc-400">Tracks fundraising activity and venture capital inflows overview.</p>
                  </div>"""
content = content.replace(details_old, details_new)

with open('/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/frontend/src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)

