# Kageyomi | Confidential Signal Terminal

Privacy-preserving AI research on SoSoValue data with UAVP verification.

> Wave 1 Submission • SoSoValue Buildathon • May 12, 2026

## One-Liner

Kageyomi lets analysts query SoSoValue institutional data through an encrypted, quorum-verified pipeline that returns encrypted insights without leaking research patterns.

## The Problem

Traditional verifier replay breaks down when an AI agent calls live external APIs. Even honest nodes can disagree because they fetch different data at different times. Kageyomi fixes that by freezing the exact canonical data the leader saw, binding it to the final output, and requiring verifiers to replay against that frozen context instead of the live network.

## Architecture

```text
User browser
-> AES-256-GCM encrypt prompt
-> IPFS ciphertext upload + CoFHE-gated key flow
-> Blindference ICL assigns leader + verifiers
-> Leader Groq agent calls SoSoValue tools
-> canonical ToolReceipts + receiptRoot + receiptsCID
-> verifier replay from frozen receipts
-> quorum output hash match
-> UAVP metadata anchored on-chain
-> local-only output decryption
```

## Why It Matters

- Institutional-style research stays private even when LLM tooling is involved.
- Verifier replay becomes deterministic again for tool-calling agents.
- Judges can inspect real receipts, hashes, and on-chain metadata instead of trusting a black box.

## What Ships In Wave 1

- SoSoValue integration for ETF, macro, news, indices, and BTC treasuries
- UAVP canonicalization for JSON and text payloads
- ToolReceipt generation, hashing, signing, Merkle rooting, and replay support
- Groq agent loop with deterministic inference settings
  default model: `llama-3.3-70b-versatile`
- FastAPI bridge for Blindference Python node integration
- Companion on-chain UAVP metadata registry via `PrivateInferenceExtension.sol`
- ICL integration for posting `receiptRoot`, `receiptsCID`, `traceHash`, and `outputHash`
- Judge-facing Next.js terminal with receipts modal and local decrypt flow
- Demo-safe cache and rate-limited SoSoValue client utilities

## What Is Reused From Blindference

- AES-256-GCM prompt and output encryption
- CoFHE-gated key release flow
- Leader / verifier quorum lifecycle
- Existing node runtime and ICL coordination
- Execution commitment verification rail

Important note:
Blindference's existing commitment registry still handles verifier commitment comparison. `PrivateInferenceExtension.sol` is a companion UAVP metadata registry that anchors the frozen-context proof artifacts alongside that existing flow.

## Repository Layout

```text
Kageyomi/
├── apps/
│   ├── agent/       # TypeScript UAVP agent core
│   ├── agent-py/    # FastAPI bridge + demo utilities
│   └── web/         # Next.js confidential terminal
├── contracts/
│   └── kageyomi/    # UAVP metadata registry contract
├── docs/
│   ├── DEMO_SCRIPT.md
│   └── JUDGE_GUIDE.md
└── README.md
```

## Quick Start

```bash
bash Kageyomi/scripts/deploy-with-blindference.sh
bash Kageyomi/scripts/run-live-stack.sh
```

This is the recommended live flow.

- Blindference deploys the core contracts first.
- Kageyomi deploys only the UAVP extension layer on top.
- The live browser submission surface is the Blindference frontend running in `VITE_KAGEYOMI_AGENT_MODE=true`.
- The Kageyomi FastAPI bridge runs beside the ICL and is used by leader and verifier nodes for UAVP agent jobs.

## Contract Deploy

```bash
bash Kageyomi/scripts/deploy-with-blindference.sh
```

That helper uses the Blindference contracts repo as the source of truth for:

- `ExecutionCommitmentRegistry`
- `PromptKeyStore`
- `AgentConfigRegistry`
- `NodeAttestationRegistry`
- `ReputationRegistry`
- `RewardAccumulator`

It then deploys:

- `PrivateInferenceExtension`
- `DisputeRegistry`
- `OracleAdapter`

Finally it syncs the addresses into the local runtime env files.

## Run The Full Architecture

```bash
bash Kageyomi/scripts/run-live-stack.sh
```

That launcher starts:

- Kageyomi FastAPI agent bridge on `127.0.0.1:8001`
- Blindference ICL on `127.0.0.1:8000`
- leader node
- verifier 1 node
- verifier 2 node
- Blindference frontend in Kageyomi agent mode on `127.0.0.1:3000`

Useful helpers:

```bash
bash Kageyomi/scripts/status-live-stack.sh
bash Kageyomi/scripts/stop-live-stack.sh
```

Why the Blindference frontend is the live UI right now:

- it already owns the wallet + CoFHE + `PromptKeyStore` flow
- it already encrypts prompts client-side and stores the prompt key on-chain
- we patched it to submit `metadata.is_agent_job=true` and surface UAVP metadata on the status page

The Next.js app in `apps/web` remains a judge/demo shell, but the fully connected browser path today is the Blindference frontend running in Kageyomi mode.

## Validation

```bash
cd Kageyomi
npm run typecheck
npm run build
npm run smoke:live --workspace @kageyomi/agent -- "BTC ETF inflow vs CPI surprises and latest ETF news sentiment"

cd contracts/kageyomi
forge build

cd ../..
python3 scripts/test-uavp-integration.py
```

Notes:

- `KAGEYOMI_USE_MOCK_SOSO=false` means the agent hits the real SoSoValue API.
- `SOSO_REQUESTS_PER_MINUTE=10` matches the buildathon rate limit.
- `npm run smoke:live --workspace @kageyomi/agent -- "<prompt>"` is the recommended no-encryption smoke test before running the full Blindference stack.

## Judge Walkthrough

1. Submit a confidential query such as `BTC ETF inflow vs CPI surprises + institutional news sentiment`.
2. Watch the status panel move through encryption, SoSoValue fetches, canonicalization, verifier replay, and trace anchoring.
3. Open the receipts modal and inspect the canonical data and hashes.
4. Confirm the on-chain metadata post for `receiptRoot`, `receiptsCID`, `traceHash`, and `outputHash`.
5. Click `Decrypt Locally` and reveal plaintext only after verification succeeds.

## Judging Alignment

| Criterion | Kageyomi Story |
| --- | --- |
| User Value | Private research workflow for analysts who do not want to leak strategy or query intent |
| Functionality | End-to-end confidential query, tool calls, canonical receipts, replay, trace anchor, and local decrypt |
| Logic / Design | Frozen-context replay makes verifier agreement possible for tool-using agents |
| API Integration | Real multi-endpoint SoSoValue usage with rate-limited client and demo cache |
| UX / Clarity | Three-panel terminal, receipt inspection modal, and explicit verification states |

## Demo Assets

- Demo script: [docs/DEMO_SCRIPT.md](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/docs/DEMO_SCRIPT.md)
- Judge guide: [docs/JUDGE_GUIDE.md](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/docs/JUDGE_GUIDE.md)
- Cached data: [apps/agent-py/src/tools/cache.json](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/apps/agent-py/src/tools/cache.json)

## Roadmap

- Wave 2: dispute routing, oracle-backed arbitration, and deeper SoSoDEX execution coupling
- Wave 3: stronger trusted execution guarantees and FHE-native extensions

## Submission Notes

- Fill in final deployed addresses after testnet deployment.
- Add the Loom demo link once recorded.
- The frontend can run in demo mode for stable judging even when live API quotas are tight.
