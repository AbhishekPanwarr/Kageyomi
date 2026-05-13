import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { inferenceApi } from '../api/inferenceApi';
import { useCofheClient } from '../hooks/useCofheClient';
import { storePromptKeyForTextRequest } from '../lib/promptKeyStore';
import { encryptPromptKeyForTextRequest, decryptOutputKey, downloadAndDecryptTextOutput } from '../utils/textPromptKey';
import type { Hex } from 'viem';
import axios from 'axios';
import { useInferenceStatus } from '../hooks/useInferenceStatus';
import { useEffect } from 'react';

import {
  Home, FlaskConical, Bot, Clock, LineChart, Settings, Book, MessageSquare, 
  Bell, Copy, Search, Activity, Newspaper, Landmark, Scale, Globe, Network, 
  ChevronRight, Lock, CheckCircle, Clock3, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

export default function Dashboard() {
  const [queryStatus, setQueryStatus] = useState<'idle' | 'processing' | 'verifying' | 'completed'>('idle');
  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [decrypted, setDecrypted] = useState(false);

  // Mock data for the chart sparkline
  const sparklineData = Array.from({ length: 20 }, (_, i) => ({ value: Math.random() * 100 + 50 }));

  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { client, isReady } = useCofheClient();
  
  const [prompt, setPrompt] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('FlowSentinel');
  const [requestId, setRequestId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const status = useInferenceStatus(requestId);
  const statusRequestId =
    status && 'raw' in status && status.raw && typeof status.raw === 'object'
      ? (('job_id' in status.raw && typeof status.raw.job_id === 'string' && status.raw.job_id) ||
        ('request_id' in status.raw && typeof status.raw.request_id === 'string' && status.raw.request_id) ||
        requestId)
      : requestId;

  useEffect(() => {
    if (!status) return;
    if (status.status === 'ASSIGNED' || status.status === 'EXECUTING') {
      setQueryStatus('processing');
    } else if (status.status === 'VERIFYING') {
      setQueryStatus('verifying');
    } else if (status.status === 'ACCEPTED') {
      setQueryStatus('completed');
    }
  }, [status?.status]);

  const handleSubmit = async () => {
    let finalPrompt = prompt.trim();
    if (!finalPrompt) return;
    if (selectedAgent === 'FlowSentinel') finalPrompt += ' Focus on institutional flows.';
    if (selectedAgent === 'NarrativeScope') finalPrompt += ' Focus on sentiment and news.';
    if (selectedAgent === 'TreasuryRadar') finalPrompt += ' Focus on corporate BTC accumulation.';

    if (!client || !isReady || !address || !publicClient || !walletClient) return;

    try {
      setError(null);
      setQueryStatus('processing');
      
      const promptKey = crypto.getRandomValues(new Uint8Array(32));
      const iv = crypto.getRandomValues(new Uint8Array(16));
      const cryptoKey = await crypto.subtle.importKey('raw', promptKey, 'AES-GCM', false, ['encrypt']);
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, tagLength: 128 },
        cryptoKey,
        new TextEncoder().encode(finalPrompt)
      );
      const encryptedBytes = new Uint8Array(encrypted);
      const ciphertext = encryptedBytes.subarray(0, encryptedBytes.length - 16);
      const authTag = encryptedBytes.subarray(encryptedBytes.length - 16);
      
      const packed = new Uint8Array(iv.length + authTag.length + ciphertext.length);
      packed.set(iv, 0); packed.set(authTag, iv.length); packed.set(ciphertext, iv.length + authTag.length);

      const encryptedPromptKey = await encryptPromptKeyForTextRequest(client, promptKey);
      const taskIdBytes = crypto.getRandomValues(new Uint8Array(32));
      const taskId = `0x${Array.from(taskIdBytes, b => b.toString(16).padStart(2, '0')).join('')}` as Hex;

      const quorumPreview = await inferenceApi.getQuorumPreview({
        model_id: 'groq:llama-3.3-70b-versatile',
        min_tier: 1, verifier_count: 2, zdr_required: false,
      });

      const allowedNodes = [quorumPreview.data.leader, ...quorumPreview.data.verifiers] as Hex[];

      const promptKeyStoreAddress = import.meta.env.VITE_PROMPT_KEY_STORE_ADDRESS as Hex;
      const promptKeyStoreTx = await storePromptKeyForTextRequest({
        taskId,
        encryptedHighInput: encryptedPromptKey.metadata.cofhe_prompt_key_inputs.high as never,
        encryptedLowInput: encryptedPromptKey.metadata.cofhe_prompt_key_inputs.low as never,
        allowedNodes, promptKeyStoreAddress, publicClient, walletClient,
      });

      const timeoutMs = Number(import.meta.env.VITE_PROMPT_UPLOAD_TIMEOUT_MS || '30000');
      const uploadResp = await new Promise<any>((resolve, reject) => {
        const tid = setTimeout(() => reject(new Error('timeout')), timeoutMs);
        inferenceApi.uploadPromptBlob(new Blob([packed])).then(v => { clearTimeout(tid); resolve(v); }).catch(reject);
      });
      const promptCID = uploadResp.data.cid;

      const response = await inferenceApi.submitText({
        developer_address: address,
        task_id: taskId,
        mode: 'text',
        model_id: 'groq:llama-3.3-70b-versatile',
        leader_address: quorumPreview.data.leader,
        verifier_addresses: quorumPreview.data.verifiers,
        text_request: {
          prompt_cid: promptCID,
          encrypted_prompt_key: { high: encryptedPromptKey.encryptedPromptKey.high, low: encryptedPromptKey.encryptedPromptKey.low },
          model_id: 'groq:llama-3.3-70b-versatile',
          coverage_enabled: false,
        },
        min_tier: 1, zdr_required: false, verifier_count: 2,
        metadata: {
          cofhe_prompt_key_inputs: encryptedPromptKey.metadata.cofhe_prompt_key_inputs,
          prompt_length: finalPrompt.length,
          vertical: 'kageyomi-uavp-demo',
          provider: 'groq', model: 'llama-3.3-70b-versatile',
          is_agent_job: true, uavp_enabled: true, kageyomi_agent: selectedAgent,
          prompt_key_store_tx: promptKeyStoreTx, prompt_key_store_status: 'stored_by_user', prompt_key_store_address: promptKeyStoreAddress,
        },
      });

      const rId =
        ('job_id' in response.data && typeof response.data.job_id === 'string' && response.data.job_id) ||
        ('request_id' in response.data && typeof response.data.request_id === 'string' && response.data.request_id) ||
        '';
      if (!rId) throw new Error('Inference submission did not return a request id');
      setRequestId(rId);

    } catch (err) {
      console.error(err);
      setError(String(err));
      setQueryStatus('idle');
    }
  };

  const handleDecrypt = async () => {
    if (!status || status.status !== 'ACCEPTED' || !client || !isReady) return;
    setIsDecrypting(true);
    try {
      const outputCid = status.text_result?.output_cid;
      const highHandle = status.text_result?.encrypted_output_key_high;
      const lowHandle = status.text_result?.encrypted_output_key_low;
      if (!outputCid || !highHandle || !lowHandle) throw new Error('Missing output handles');
      
      const outputKey = await decryptOutputKey(client, highHandle, lowHandle);
      const answer = await downloadAndDecryptTextOutput(outputCid, outputKey);
      setTextAnswer(answer);
      setDecrypted(true);
      setShowDecryptModal(false);
    } catch (e) {
      console.error(e);
      setError('Decryption failed');
    }
    setIsDecrypting(false);
  };


  return (
    <div className="min-h-screen bg-zinc-950 text-white flex overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex w-[240px] flex-col border-r border-zinc-900 bg-zinc-950 z-20 shrink-0">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-900">
          <img
            alt="Kageyomi"
            className="h-10 w-auto object-contain shrink-0"
            src="/kageyomi-logo.jpeg"
          />
          <span className="font-semibold text-lg tracking-[0.26em] text-white">
            KAGEYOMI
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <NavItem icon={Home} label="Home" active />
          <NavItem icon={FlaskConical} label="Research" />
          <NavItem icon={Bot} label="Agents" badge="7 Active" />
          <NavItem icon={Clock} label="History" />
          <NavItem icon={LineChart} label="Portfolio" />
          <NavItem icon={Settings} label="Settings" />
        </div>

        <div className="p-4 border-t border-zinc-900 space-y-1">
          <NavItem icon={Book} label="Documentation" />
          <NavItem icon={MessageSquare} label="Support" />
          <div className="px-3 py-2 text-xs text-zinc-600 font-mono mt-4">v1.0.0-beta</div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-900 bg-zinc-950 flex items-center justify-between px-6 shrink-0 z-10 w-full">
          <div className="flex items-center gap-2 md:hidden">
            <img
              alt="Kageyomi"
              className="h-9 w-auto object-contain shrink-0"
              src="/kageyomi-logo.jpeg"
            />
            <span className="font-semibold text-sm tracking-[0.22em] text-white">
              KAGEYOMI
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-6 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>Mainnet</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Gas:</span>
              <span className="text-zinc-300">12 gwei</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>SoSoValue API: Live</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-md text-sm font-mono cursor-pointer hover:border-white/20 transition-colors">
              <span>0x7F9B...38dc</span>
              <Copy className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <button className="relative p-2 text-zinc-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white border border-black" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-900 border border-zinc-700/80" />
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto flex flex-col lg:flex-row relative">
          
          {/* Main Content Workspace */}
          <main className="flex-1 p-6 lg:p-8 space-y-8 min-w-0">
            {/* Conditional Rendering based on state */}
            {queryStatus === 'idle' ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-5xl mx-auto">
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold text-white">Good morning, Researcher</h1>
                  <p className="text-zinc-400 text-sm">Secure isolated environment initialized.</p>
                </div>

                {/* Grid Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title="Active Research Jobs" value="3" trend="+1" />
                  <StatCard title="Total Queries" value="47" sub="this month" />
                  <StatCard title="Avg. Response" value="2.3s" sub="isolated enclave" />
                  <StatCard title="Verification Rate" value="100%" color="white" sub="on-chain verified" />
                </div>

                {/* Query Input */}
                <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl relative">
                  <div className="relative">
                    <Search className="absolute left-4 top-4 w-6 h-6 text-zinc-500" />
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ask Kageyomi anything about crypto markets..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-14 pr-4 py-4 text-white focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 resize-none min-h-[100px] transition-all"
                    ></textarea>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 rounded bg-white/5 text-zinc-300 text-xs hover:bg-white/10 transition">BTC ETF flows vs CPI</button>
                      <button className="px-3 py-1.5 rounded bg-white/5 text-zinc-300 text-xs hover:bg-white/10 transition">MSTR accumulation pattern</button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="text-zinc-400 text-sm hover:text-white flex items-center gap-1">
                        <Settings className="w-4 h-4" /> Agent Configuration
                      </button>
                      <button 
                        onClick={handleSubmit}
                        disabled={queryStatus !== 'idle'}
                        className="px-6 py-2 bg-white hover:bg-zinc-200 text-black text-sm font-medium rounded-lg transition-colors font-semibold flex items-center gap-2 disabled:opacity-50"
                      >
                        <Lock className="w-4 h-4" /> {queryStatus !== 'idle' ? 'Processing...' : 'Run Confidential Analysis'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active Agents Summary */}
                <div className="space-y-4">
                  <h2 className="text-lg font-medium">Active Agents</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div onClick={() => setSelectedAgent('FlowSentinel')} className={selectedAgent === 'FlowSentinel' ? 'ring-2 ring-emerald-500 rounded-xl' : ''}>
                      <SmallAgentCard icon={Activity} name="FlowSentinel" stat="+$1.2B inflow (7d)" sparkline={sparklineData} />
                    </div>
                    <div onClick={() => setSelectedAgent('NarrativeScope')} className={selectedAgent === 'NarrativeScope' ? 'ring-2 ring-emerald-500 rounded-xl' : ''}>
                      <SmallAgentCard icon={Newspaper} name="NarrativeScope" stat="+0.76 bullish" sparkline={sparklineData} />
                    </div>
                    <div onClick={() => setSelectedAgent('TreasuryRadar')} className={selectedAgent === 'TreasuryRadar' ? 'ring-2 ring-emerald-500 rounded-xl' : ''}>
                      <SmallAgentCard icon={Landmark} name="TreasuryRadar" stat="MSTR: +3,015 BTC" sparkline={sparklineData} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              // Results View
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-zinc-500 font-mono mb-1">Query <span className="text-zinc-400">0x7a3b...c91d</span></div>
                      <h2 className="text-xl font-medium tracking-wide">"Analyze BTC institutional flows ahead of CPI"</h2>
                    </div>
                    {queryStatus === 'completed' && (
                      <button 
                        onClick={() => setShowDecryptModal(true)}
                        className={cn(
                          "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
                          decrypted ? "bg-white/10 text-white cursor-default" : "bg-white hover:bg-zinc-200 text-black"
                        )}
                      >
                        {decrypted ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        {decrypted ? "Decrypted Locally" : "Decrypt Output"}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Clock3 className="w-4 h-4" /> <span>May 12, 2026 3:28 PM UTC</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-300">
                      <ShieldCheck className="w-4 h-4" /> <span>Verified on Fhenix</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Bot className="w-4 h-4" /> <span>6/7 agents aligned</span>
                    </div>
                  </div>
                </div>

                {/* Loading / Verifying State */}
                {queryStatus !== 'completed' && (
                  <div className="flex flex-col items-center justify-center py-20 space-y-6">
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 border-t-2 border-white/20 rounded-full animate-spin"></div>
                      <div className="absolute inset-2 border-r-2 border-white/20 rounded-full animate-spin-reverse"></div>
                      <Lock className="absolute inset-0 m-auto w-8 h-8 text-zinc-400 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-medium text-white mb-2">
                        {queryStatus === 'processing' ? 'Processing via Encrypted Inference...' : 'Forming Quorum Consensus...'}
                      </h3>
                      <p className="text-zinc-500 text-sm">
                        {queryStatus === 'processing' ? 'Payload never leaves enclave in plaintext.' : 'Cryptographically verifying agent outputs.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Final Results State */}
                {queryStatus === 'completed' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    {/* Encrypted Overlay Wrapper if not decrypted */}
                    <div className="relative">
                      {!decrypted && (
                        <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-black/60 rounded-xl flex items-center justify-center border border-white/[0.12]">
                          <div className="text-center space-y-4">
                            <Lock className="w-12 h-12 text-zinc-400 mx-auto" />
                            <h3 className="text-xl font-medium text-white">Results Encrypted</h3>
                            <p className="text-zinc-400 text-sm max-w-sm">Output requires your Fhenix private key to decrypt locally. Data is sealed.</p>
                            <button 
                              onClick={() => setShowDecryptModal(true)}
                              className="px-6 py-2 bg-white hover:bg-zinc-200 text-black rounded-lg mt-2"
                            >
                              Decrypt to View
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className={cn("space-y-6 transition-all duration-700", !decrypted ? "opacity-20 select-none blur-sm" : "opacity-100")}>
                        {/* StrategyForge Synthesis */}
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
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </main>

          {/* Right Panel - Always visible on desktop, hidden on small */}
          <aside className="w-[320px] bg-zinc-950 border-l border-zinc-900 shrink-0 hidden lg:flex flex-col z-10 sticky top-0 h-full overflow-y-auto">
            <div className="p-6 space-y-8">
              
              {/* Status Tracker */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-zinc-400 uppercase tracking-widest">Execution Trace</h3>
                
                <div className="relative pl-6 space-y-6">
                  {/* Timeline Line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-white/5" />
                  
                  <TimelineItem 
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
                  />
                </div>
              </div>

              {/* Cryptographic Proofs */}
              {queryStatus === 'completed' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-6 border-t border-zinc-800">
                  <h3 className="font-medium text-sm text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-zinc-400" /> UAVP Proof
                  </h3>
                  <div className="space-y-3 font-mono text-xs">
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
                  </div>
                  <button className="w-full py-2 bg-white/5 hover:bg-white/10 text-xs font-medium rounded text-zinc-300 transition-colors">
                    Verify Explorer
                  </button>
                </motion.div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Decrypt Modal Overlay */}
      <AnimatePresence>
        {showDecryptModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-zinc-900/80 border border-zinc-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-white/[0.05] mx-auto flex items-center justify-center mb-4">
                  <Unlock className="w-8 h-8 text-zinc-400" />
                </div>
                <h2 className="text-xl font-bold">Decrypt Locally?</h2>
                <p className="text-sm text-zinc-400">Plaintext will only exist in your browser memory.</p>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-zinc-500">
                    <span>Checking Fhenix Key...</span>
                    <span className="text-zinc-400">Found</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: "100%" }} 
                      transition={{ duration: 1.5 }}
                      className="h-full bg-white" 
                    />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowDecryptModal(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDecrypt}
                    disabled={isDecrypting}
                    className="flex-1 py-3 bg-white hover:bg-zinc-200 text-black rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)] disabled:opacity-50"
                  >
                    {isDecrypting ? 'Decrypting...' : 'Confirm Decrypt'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Subcomponents

function Unlock(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
    </svg>
  );
}

function NavItem({ icon: Icon, label, active, badge }: { icon: any, label: string, active?: boolean, badge?: string }) {
  return (
    <a href="#" className={cn(
      "flex items-center justify-between px-3 py-2 rounded-lg transition-colors group",
      active ? "bg-white/[0.05] text-zinc-300" : "text-zinc-400 hover:bg-white/5 hover:text-white"
    )}>
      <div className="flex items-center gap-3">
        <Icon className={cn("w-5 h-5", active ? "text-zinc-400" : "text-zinc-500 group-hover:text-zinc-300")} />
        <span className="font-medium text-sm">{label}</span>
      </div>
      {badge && <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">{badge}</span>}
    </a>
  );
}

function StatCard({ title, value, trend, sub, color = "white" }: { title: string, value: string, trend?: string, sub?: string, color?: "white" | "green" | "red" }) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between h-28 hover:border-zinc-700 transition-colors">
      <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider">{title}</div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold font-mono text-white">{value}</div>
        {trend && <div className="text-zinc-300 text-xs font-medium bg-white/[0.05] px-1.5 py-0.5 rounded">{trend}</div>}
        {sub && <div className="text-zinc-600 text-xs">{sub}</div>}
      </div>
    </div>
  );
}

function SmallAgentCard({ icon: Icon, name, stat, sparkline }: any) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 h-24 flex items-center justify-between group hover:border-zinc-700 transition-colors cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-950 flex items-center justify-center transition-colors border border-zinc-800">
          <Icon className="w-5 h-5 text-zinc-400 group-hover:text-zinc-300" />
        </div>
        <div>
          <div className="font-medium flex items-center gap-2">
            {name} <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-white transition-colors" />
          </div>
          <div className="text-xs text-zinc-500 mt-1">{stat}</div>
        </div>
      </div>
      <div className="w-16 h-8 opacity-50 group-hover:opacity-100 transition-opacity">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkline}>
            <Area type="monotone" dataKey="value" stroke="#ffffff" fill="#ffffff" fillOpacity={0.1} strokeWidth={1} isAnimationActive={false} />
            <YAxis domain={['dataMin', 'dataMax']} hide />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TimelineItem({ status, title, desc, time }: { status: 'success'|'active'|'pending', title: string, desc?: string, time?: string }) {
  return (
    <div className="relative">
      {/* Node */}
      <div className={cn(
        "absolute -left-6 top-1 w-[11px] h-[11px] rounded-full border-[2px] z-10 bg-zinc-950",
        status === 'success' ? "border-white/20" :
        status === 'active' ? "border-white/20 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" :
        "border-zinc-700"
      )} />
      
      <div>
        <div className={cn(
          "text-sm font-medium",
          status === 'pending' ? "text-zinc-600" : "text-white"
        )}>
          {title}
        </div>
        {(desc || time) && (
          <div className={cn(
            "text-xs mt-1 font-mono",
            status === 'success' ? "text-zinc-400" : "text-zinc-600"
          )}>
            {time || desc}
          </div>
        )}
      </div>
    </div>
  );
}
