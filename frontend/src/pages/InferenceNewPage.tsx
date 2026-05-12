import { useNavigate } from 'react-router-dom'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { Lock, ShieldAlert } from 'lucide-react'
import { PermitUtils } from '@cofhe/sdk/permits'
import type { Hex } from 'viem'
import axios from 'axios'
import { useState } from 'react'

import { inferenceApi } from '../api/inferenceApi'
import { TextInferenceWizard } from '../components/inference/TextInferenceWizard'
import { useCofheClient } from '../hooks/useCofheClient'
import { readStoredRiskInputHandles, storeEncryptedRiskInputsInVault } from '../lib/inputVault'
import { useInferenceStore } from '../stores/inferenceStore'
import { encryptRiskFeatures } from '../utils/encryption'
import { cn } from '../utils/helpers'

const MODEL_BINDINGS = {
  'llama3-70b': {
    modelId: 'groq:llama-3.3-70b-versatile',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    baseFee: 10,
    telemetry: {
      accuracy: '94.2%',
      falsePositives: '1.2%',
      hallucinations: '< 0.5%',
      benchmark: '82.0 MMLU',
    },
  },
  'gemini-pro': {
    modelId: 'gemini:gemini-2.5-flash',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    baseFee: 8,
    telemetry: {
      accuracy: '96.8%',
      falsePositives: '0.8%',
      hallucinations: '< 0.2%',
      benchmark: '86.2 MMLU',
    },
  },
} as const
const KAGEYOMI_AGENT_MODE = import.meta.env.VITE_KAGEYOMI_AGENT_MODE === 'true'

export function InferenceNewPage() {
  const [mode, setMode] = useState<'risk' | 'text'>(KAGEYOMI_AGENT_MODE ? 'text' : 'risk')
  const navigate = useNavigate()
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { client, isReady } = useCofheClient()
  const store = useInferenceStore()

  const currentModel = MODEL_BINDINGS[store.modelId]
  const basePrice = currentModel.baseFee
  const coveragePremium = store.coverageEnabled ? 2 : 0
  const totalDisplay = basePrice + coveragePremium

  const handleSubmit = async () => {
    if (store.creditScore < 300 || store.creditScore > 850) {
      store.setError('Invalid credit score. Must be between 300 and 850.')
      return
    }

    if (!client || !isReady || !address) {
      store.setError('Connect your wallet and wait for CoFHE to initialize.')
      return
    }
    if (!walletClient || !publicClient) {
      store.setError('Wallet client is not available yet.')
      return
    }

    const inputVaultAddress = import.meta.env.VITE_BLINDFERENCE_INPUT_VAULT_ADDRESS as Hex | undefined
    if (!inputVaultAddress) {
      store.setError('VITE_BLINDFERENCE_INPUT_VAULT_ADDRESS is not configured.')
      return
    }

    try {
      store.setError(null)
      store.setIsEncrypting(true)
      const loanId = `loan_${Date.now()}`

      const encrypted = await encryptRiskFeatures(client, {
        creditScore: store.creditScore,
        loanAmount: store.loanAmount,
        accountAge: store.accountAge,
        prevDefaults: store.prevDefaults,
      })

      const inputVaultTx = await storeEncryptedRiskInputsInVault({
        encryptedInputs: encrypted,
        loanId,
        publicClient,
        vaultAddress: inputVaultAddress,
        walletClient,
      })

      const storedVaultInputs = await readStoredRiskInputHandles({
        loanId,
        publicClient,
        vaultAddress: inputVaultAddress,
      })
      if (storedVaultInputs.owner.toLowerCase() !== address.toLowerCase()) {
        throw new Error('BlindferenceInputVault stored handles for a different owner than the connected wallet.')
      }

      const vaultBackedEncryptedInput = encrypted.map((item, index) => ({
        ctHash: storedVaultInputs.handles[index].toString(),
        utype: item.utype,
        signature: item.signature,
      }))

      const quorumPreview = await inferenceApi.getQuorumPreview({
        model_id: currentModel.modelId,
        min_tier: 1,
        verifier_count: 2,
        zdr_required: false,
      })
      const quorumNodes = [quorumPreview.data.leader, ...quorumPreview.data.verifiers]

      const permits = await Promise.all(
        quorumNodes.map(async (nodeAddress) => {
          const sharingPermit = await client.permits.createSharing({
            issuer: address,
            recipient: nodeAddress,
            name: `Blindference ${currentModel.modelId} ${Date.now()} -> ${nodeAddress}`,
          })
          return {
            node: nodeAddress,
            permit: PermitUtils.export(sharingPermit),
          }
        }),
      )

      store.setIsEncrypting(false)
      store.setIsSubmitting(true)

      const response = await inferenceApi.submit({
        model_id: currentModel.modelId,
        encrypted_input: vaultBackedEncryptedInput,
        permits,
        leader_address: quorumPreview.data.leader,
        verifier_addresses: quorumPreview.data.verifiers,
        feature_types: ['uint32', 'uint64', 'uint32', 'uint8'],
        loan_id: loanId,
        coverage_type: store.coverageEnabled ? 'HALLUCINATION' : null,
        max_fee_gnk: totalDisplay,
        developer_address: address,
        min_tier: 1,
        zdr_required: false,
        verifier_count: 2,
        metadata: {
          coverage_requested: store.coverageEnabled,
          encryption_mode: 'cofhe',
          input_vault_address: inputVaultAddress,
          input_vault_tx: inputVaultTx,
          input_vault_owner: storedVaultInputs.owner,
          input_vault_stored_at: storedVaultInputs.storedAt.toString(),
          vertical: 'blindference-risk-demo',
          provider: currentModel.provider,
          model: currentModel.model,
        },
      })

      store.setRequestId(response.data.request_id)
      navigate(`/inference/${response.data.request_id}`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail
        if (typeof detail === 'string' && detail.trim()) {
          store.setError(detail)
          return
        }
      }
      store.setError(error instanceof Error ? error.message : 'Failed to submit request.')
    } finally {
      store.setIsSubmitting(false)
      store.setIsEncrypting(false)
    }
  }

  return (
    <div className={KAGEYOMI_AGENT_MODE ? "min-h-screen bg-zinc-950 text-white" : "mx-auto max-w-2xl pb-20 pt-12"}>
      {KAGEYOMI_AGENT_MODE ? (
        <div className="px-6 py-12 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
            <main className="space-y-8">
              <section className="rounded-[28px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(24,24,27,0.92),rgba(10,10,10,0.9))] px-6 py-7 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:px-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h1 className="text-4xl font-medium tracking-tight text-white">New Confidential Research Job</h1>
                    <p className="mt-3 max-w-2xl text-base text-zinc-500">
                      Encrypted SoSoValue research routed through Blindference quorum verification and UAVP replay.
                    </p>
                  </div>
                  <span className="inline-flex rounded-full border border-zinc-700 bg-black px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-200">
                    KAGEYOMI AGENT MODE
                  </span>
                </div>
              </section>

              <section className="rounded-[28px] border border-zinc-900/80 bg-[radial-gradient(circle_at_25%_35%,rgba(52,211,153,0.08),transparent_26%),radial-gradient(circle_at_82%_64%,rgba(52,211,153,0.06),transparent_18%),linear-gradient(180deg,rgba(17,17,19,0.98),rgba(10,10,10,0.98))] px-6 py-8 shadow-[0_30px_90px_rgba(0,0,0,0.5)] sm:px-8">
                <TextInferenceWizard />
              </section>
            </main>

            <aside className="space-y-4 xl:pt-[154px]">
              <div className="rounded-[28px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(8,8,8,0.98))] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
                <h3 className="text-sm font-medium uppercase tracking-[0.34em] text-zinc-400">Execution Outline</h3>
                <div className="mt-6 space-y-4">
                  {[
                    'Encrypt prompt and store split key routing via PromptKeyStore.',
                    'Assign leader plus two verifiers through Blindference quorum selection.',
                    'Leader runs the selected Kageyomi agent path and records canonical SoSoValue receipts.',
                    'Verifiers replay from frozen receipts, compare hashes, then unlock local decryption.',
                  ].map((step, index) => (
                    <div key={step} className="rounded-2xl border border-zinc-800 bg-black px-4 py-5">
                      <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">Step 0{index + 1}</p>
                      <p className="mt-3 text-base leading-8 text-zinc-200">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      ) : (
      <div className="mx-auto max-w-2xl pb-20 pt-12">
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-medium text-white tracking-tight">
            {KAGEYOMI_AGENT_MODE
              ? 'New Confidential Research Job'
              : mode === 'risk'
                ? 'New Risk Assessment'
                : 'New Text Inference'}
          </h1>
          <p className="text-sm text-gray-500">
            {KAGEYOMI_AGENT_MODE
              ? 'Encrypted SoSoValue research routed through Blindference quorum verification and UAVP replay.'
              : 'Secure, end-to-end encrypted inference via FHE.'}
          </p>
        </div>
        <span className={KAGEYOMI_AGENT_MODE
          ? "rounded-full border border-zinc-700 bg-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-300"
          : "rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-500"}>
          {KAGEYOMI_AGENT_MODE ? 'Kageyomi Agent Mode' : 'FHE Active'}
        </span>
      </div>

      {!KAGEYOMI_AGENT_MODE ? (
        <div className="mb-10 inline-flex rounded-lg border border-white/10 bg-black p-1">
          <button
            className={cn(
              'rounded-md px-6 py-2.5 text-sm font-semibold transition-colors',
              mode === 'risk' ? 'bg-white text-black' : 'text-gray-500 hover:text-white',
            )}
            onClick={() => setMode('risk')}
            type="button"
          >
            Risk Score
          </button>
          <button
            className={cn(
              'rounded-md px-6 py-2.5 text-sm font-semibold transition-colors',
              mode === 'text' ? 'bg-white text-black' : 'text-gray-500 hover:text-white',
            )}
            onClick={() => setMode('text')}
            type="button"
          >
            Text Inference
          </button>
        </div>
      ) : null}

      {mode === 'risk' && store.error ? (
        <div className="mb-8 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-500">
          <ShieldAlert className="h-5 w-5" />
          {store.error}
        </div>
      ) : null}

      {mode === 'text' ? (
        <div className={KAGEYOMI_AGENT_MODE ? "grid gap-8 xl:grid-cols-[1.35fr_0.65fr]" : ""}>
          <div>
            <TextInferenceWizard />
          </div>
          {KAGEYOMI_AGENT_MODE ? (
            <aside className="space-y-6">
              <div className="rounded-[24px] border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Execution Outline</p>
                <div className="mt-5 space-y-4">
                  {[
                    'Encrypt prompt and store split key routing via PromptKeyStore.',
                    'Assign leader plus two verifiers through Blindference quorum selection.',
                    'Leader runs the selected Kageyomi agent path and records canonical SoSoValue receipts.',
                    'Verifiers replay from frozen receipts, compare hashes, then unlock local decryption.',
                  ].map((step, index) => (
                    <div key={step} className="rounded-xl border border-zinc-800 bg-black px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Step 0{index + 1}</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Terminal Note</p>
                <p className="mt-4 text-sm leading-7 text-zinc-400">
                  This page is now the connected Kageyomi frontend. It uses the live Blindference wallet, CoFHE, ICL, and status flow rather than the old demo-only shell.
                </p>
              </div>
            </aside>
          ) : null}
        </div>
      ) : (
      <div className="space-y-8">
        <div className="space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">Model Selection</label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(['llama3-70b', 'gemini-pro'] as const).map((id) => {
              const isSelected = store.modelId === id
              return (
                <button
                  className={cn(
                    'cursor-pointer rounded-xl p-5 text-left outline-none transition-all flex flex-col gap-1.5',
                    isSelected
                      ? 'border border-emerald-500 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : 'border border-white/10 bg-black hover:border-white/30',
                  )}
                  key={id}
                  onClick={() => store.setModelId(id)}
                  type="button"
                >
                  <span className="text-base font-semibold capitalize text-white">{id.replace('-', ' ')}</span>
                  <span className="text-xs text-gray-500">{id === 'gemini-pro' ? 'Google API' : 'DePIN execution'}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 w-full space-y-3 rounded-xl border border-white/10 bg-white/[0.01] p-5">
            <div className="border-b border-white/5 pb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
              Model Telemetry
            </div>
            <div className="mt-3 grid grid-cols-2 gap-6 text-sm sm:grid-cols-4">
              <div>
                <span className="mb-1.5 block text-[10px] uppercase text-gray-500">Accuracy</span>
                <span className="font-mono text-white">{currentModel.telemetry.accuracy}</span>
              </div>
              <div>
                <span className="mb-1.5 block text-[10px] uppercase text-gray-500">False Positives</span>
                <span className="font-mono text-white">{currentModel.telemetry.falsePositives}</span>
              </div>
              <div>
                <span className="mb-1.5 block text-[10px] uppercase text-gray-500">Hallucinations</span>
                <span className="font-mono text-white">{currentModel.telemetry.hallucinations}</span>
              </div>
              <div>
                <span className="mb-1.5 block text-[10px] uppercase text-gray-500">Benchmark</span>
                <span className="font-mono text-white">{currentModel.telemetry.benchmark}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
            Applicant Data (Encrypted)
          </label>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <span className="text-xs font-medium text-gray-400">Credit Score</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                max={850}
                min={300}
                onChange={(event) => store.setCreditScore(Number(event.target.value))}
                type="number"
                value={store.creditScore}
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium text-gray-400">Loan Amount ($)</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                min={0}
                onChange={(event) => store.setLoanAmount(Number(event.target.value))}
                type="number"
                value={store.loanAmount}
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium text-gray-400">Account Age (days)</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                min={0}
                onChange={(event) => store.setAccountAge(Number(event.target.value))}
                type="number"
                value={store.accountAge}
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium text-gray-400">Previous Defaults</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                max={10}
                min={0}
                onChange={(event) => store.setPrevDefaults(Number(event.target.value))}
                type="number"
                value={store.prevDefaults}
              />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.01] p-5 hover:border-white/20 transition-colors">
          <input
            checked={store.coverageEnabled}
            className="mt-1 cursor-pointer h-5 w-5 rounded border-white/20 bg-black text-emerald-500 focus:ring-emerald-500 focus:ring-offset-black"
            onChange={(event) => store.setCoverageEnabled(event.target.checked)}
            type="checkbox"
          />
          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold text-white">Hallucination Coverage</h4>
            <p className="text-xs leading-relaxed text-gray-500">
              Receive up to 500 USDC payout if the prediction is disputed and settled in your favor. Premium is
              automatically calculated.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-white/10 pt-8 gap-6 sm:gap-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">Estimated Fee</span>
            <div className="text-2xl font-mono text-white mt-1">
              {totalDisplay}.00 <span className="text-emerald-500 text-lg">GNK</span>
            </div>
          </div>

          <button
            className="flex w-full sm:w-auto min-w-[220px] items-center justify-center rounded-xl bg-emerald-500 px-8 py-4 text-sm font-bold text-black transition-all hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={store.isEncrypting || store.isSubmitting || !isReady || !address}
            onClick={handleSubmit}
            type="button"
          >
            {store.isEncrypting ? (
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 animate-pulse text-black" />
                Encrypting...
              </div>
            ) : store.isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                Submitting
              </div>
            ) : (
              'Run Encrypted Inference'
            )}
          </button>
        </div>
      </div>
      )}
      </div>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  trend,
  sub,
  color,
}: {
  title: string
  value: string
  trend?: string
  sub?: string
  color?: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="text-sm text-zinc-500">{title}</div>
      <div className={`mt-2 text-2xl font-semibold ${color === 'white' ? 'text-white' : 'text-zinc-100'}`}>{value}</div>
      <div className="mt-2 text-xs text-zinc-500">{trend || sub}</div>
    </div>
  )
}
