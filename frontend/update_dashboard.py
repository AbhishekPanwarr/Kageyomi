import re

with open('/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/frontend/src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# 1. Imports
imports_to_add = """
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { inferenceApi } from '../api/inferenceApi';
import { useCofheClient } from '../hooks/useCofheClient';
import { storePromptKeyForTextRequest } from '../lib/promptKeyStore';
import { encryptPromptKeyForTextRequest, decryptOutputKey, downloadAndDecryptTextOutput } from '../utils/textPromptKey';
import type { Hex } from 'viem';
import axios from 'axios';
import { useInferenceStatus } from '../hooks/useInferenceStatus';
import { useEffect } from 'react';
"""
content = content.replace("import { motion, AnimatePresence } from 'motion/react';", "import { motion, AnimatePresence } from 'framer-motion';\n" + imports_to_add)

# 2. State and Wagmi hooks inside Dashboard
hooks_to_add = """
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

      const rId = response.data.job_id || response.data.request_id;
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
"""

content = content.replace("const sparklineData = Array.from({ length: 20 }, (_, i) => ({ value: Math.random() * 100 + 50 }));", 
"""const sparklineData = Array.from({ length: 20 }, (_, i) => ({ value: Math.random() * 100 + 50 }));
""" + hooks_to_add)

# 3. Replace the submit button action and text area binding
content = content.replace(
"""<textarea 
                      placeholder="Ask Kageyomi anything about crypto markets..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-14 pr-4 py-4 text-white focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 resize-none min-h-[100px] transition-all"
                    ></textarea>""",
"""<textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ask Kageyomi anything about crypto markets..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-14 pr-4 py-4 text-white focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 resize-none min-h-[100px] transition-all"
                    ></textarea>"""
)

content = content.replace(
"""<button 
                        onClick={() => {
                          setQueryStatus('processing');
                          setTimeout(() => setQueryStatus('verifying'), 2500);
                          setTimeout(() => setQueryStatus('completed'), 5000);
                        }}
                        className="px-6 py-2 bg-white hover:bg-zinc-200 text-black text-sm font-medium rounded-lg transition-colors font-semibold flex items-center gap-2"
                      >
                        <Lock className="w-4 h-4" /> Run Confidential Analysis
                      </button>""",
"""<button 
                        onClick={handleSubmit}
                        disabled={queryStatus !== 'idle'}
                        className="px-6 py-2 bg-white hover:bg-zinc-200 text-black text-sm font-medium rounded-lg transition-colors font-semibold flex items-center gap-2 disabled:opacity-50"
                      >
                        <Lock className="w-4 h-4" /> {queryStatus !== 'idle' ? 'Processing...' : 'Run Confidential Analysis'}
                      </button>"""
)

# 4. Handle Agent Selection on Click
content = content.replace(
"""<SmallAgentCard icon={Activity} name="FlowSentinel" stat="+$1.2B inflow (7d)" sparkline={sparklineData} />
                    <SmallAgentCard icon={Newspaper} name="NarrativeScope" stat="+0.76 bullish" sparkline={sparklineData} />
                    <SmallAgentCard icon={Landmark} name="TreasuryRadar" stat="MSTR: +3,015 BTC" sparkline={sparklineData} />""",
"""<div onClick={() => setSelectedAgent('FlowSentinel')} className={selectedAgent === 'FlowSentinel' ? 'ring-2 ring-emerald-500 rounded-xl' : ''}>
                      <SmallAgentCard icon={Activity} name="FlowSentinel" stat="+$1.2B inflow (7d)" sparkline={sparklineData} />
                    </div>
                    <div onClick={() => setSelectedAgent('NarrativeScope')} className={selectedAgent === 'NarrativeScope' ? 'ring-2 ring-emerald-500 rounded-xl' : ''}>
                      <SmallAgentCard icon={Newspaper} name="NarrativeScope" stat="+0.76 bullish" sparkline={sparklineData} />
                    </div>
                    <div onClick={() => setSelectedAgent('TreasuryRadar')} className={selectedAgent === 'TreasuryRadar' ? 'ring-2 ring-emerald-500 rounded-xl' : ''}>
                      <SmallAgentCard icon={Landmark} name="TreasuryRadar" stat="MSTR: +3,015 BTC" sparkline={sparklineData} />
                    </div>"""
)

# 5. Connect decrypt action
content = content.replace(
"""<button 
                    onClick={() => {
                      setDecrypted(true);
                      setShowDecryptModal(false);
                    }}
                    className="flex-1 py-3 bg-white hover:bg-zinc-200 text-black rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                  >
                    Confirm Decrypt
                  </button>""",
"""<button 
                    onClick={handleDecrypt}
                    disabled={isDecrypting}
                    className="flex-1 py-3 bg-white hover:bg-zinc-200 text-black rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)] disabled:opacity-50"
                  >
                    {isDecrypting ? 'Decrypting...' : 'Confirm Decrypt'}
                  </button>"""
)

# 6. Show the real decrypted answer
content = content.replace(
"""Direction: INFLOW (accelerating)<br/>
                          7-Day Trend: +$1.2B cumulative net flow<br/><br/>
                          
                          📊 Key Metrics:<br/>
                          • IBIT: +$420M single-day inflow<br/>
                          • FBTC: +$312M inflow<br/>
                          • Total AUM: $56.2B<br/><br/>
                          
                          💡 Narrative:<br/>
                          "Institutional demand absorbing macro uncertainty. Smart money accumulating below $65K support."
                        </div>""",
"""{textAnswer || 'Loading...'}
                        </div>"""
)

with open('/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/frontend/src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)

