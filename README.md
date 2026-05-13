<div align="center">

# 影 Kageyomi

### Confidential Multi-Agent Crypto Research on Fhenix CoFHE

**Built for the [SoSoValue Buildathon 2026](https://app.akindo.io/wave-hacks/JBEQXgN4Zi2jA3wA?tab=overview)**

[![SoSoValue](https://img.shields.io/badge/SoSoValue-API-blue?style=flat-square)](https://sosovalue-1.gitbook.io/sosovalue-api-doc)
[![Fhenix CoFHE](https://img.shields.io/badge/Fhenix-CoFHE-purple?style=flat-square)](https://cofhe-docs.fhenix.zone/)
[![Reineira](https://img.shields.io/badge/Reineira-orange?style=flat-square)](https://reineira.xyz/)
[![Blindference](https://img.shields.io/badge/Blindference-Architecture-green?style=flat-square)](https://ivory-late-quokka-745.mypinata.cloud/ipfs/bafybeicnnfmvj6xt2w2dhvv6idfxje3fvtgu7ngbwmreknn53utneomezy)

</div>

---

## What Is Kageyomi?

**Kageyomi** (影読み, *shadow-reading*) is a confidential, multi-agent crypto research platform designed for institutional-grade market intelligence. 

### The Problem: Alpha Leakage and Verifiability
When funds or researchers use standard AI platforms to analyze markets, they face two critical issues:
1. **Intent Leakage:** Querying an AI about specific on-chain movements, ETF flows, or accumulation patterns reveals proprietary trading intent to the service provider. 
2. **Lack of Verifiability:** AI models hallucinate. In financial research, an AI's output is useless unless its data sources and execution path can be cryptographically proven.

### The Solution: Kageyomi
Kageyomi solves this by deploying a network of specialized AI agents within a cryptographically verifiable, privacy-preserving execution environment. It combines fully homomorphic encryption (Fhenix CoFHE) with on-chain verification (Reineira Settlements) and live market data (SoSoValue).

**How it works in practice:**
Imagine an analyst investigating a potential market shift: *"Correlate recent MicroStrategy (MSTR) accumulation patterns with incoming macroeconomic data (CPI/FOMC) to assess near-term Bitcoin liquidity risk."*

1. **Confidential Submission:** The analyst's query is encrypted directly in their browser using AES-GCM. The decryption keys are secured via Fhenix CoFHE's on-chain ACL. The central infrastructure never sees the plaintext intent.
2. **Specialized Agent Routing:** A decentralized leader node decrypts the prompt within a secure enclave and routes it to specific Kageyomi agents. *TreasuryRadar* fetches MSTR purchase history, while *MacroShield* analyzes upcoming CPI/FOMC events—both querying live SoSoValue data.
3. **Provable Execution (Fhenix):** Every data point fetched by the agents generates a cryptographically signed receipt. These receipts are hashed into a Merkle root and anchored on-chain.
4. **Quorum Verification:** Independent verifier nodes fetch the frozen receipts from IPFS and deterministically replay the agent's synthesis. They guarantee the AI didn't hallucinate and only used the canonical SoSoValue data.
5. **Private Delivery:** Once the quorum achieves consensus, the encrypted strategy report is returned to the analyst, where it is decrypted locally. 

The result is proprietary crypto research with **provable integrity**: the insights are mathematically verifiable, untampered, and completely hidden from the network operators.

---

## Key Integrations

| Layer | Technology | Role |
|---|---|---|
| **Data** | [SoSoValue API](https://sosovalue-1.gitbook.io/sosovalue-api-doc) | Live market data: ETF flows, BTC treasuries, macro events, indices, fundraising, news feeds |
| **Privacy** | [Fhenix CoFHE](https://cofhe-docs.fhenix.zone/) | Fully Homomorphic Encryption — prompt encrypted in browser, key permissioned via on-chain ACL |
| **Verification** | [Our own Protocol and Reineira Settlements](https://reineira.xyz/) | On-chain proof of faithful agent execution via receipt Merkle roots and deterministic verifier replay |
| **Quorum** | Blindference | 1 leader + 2 verifier node network for consensus-gated research delivery |

---

## The 7 Specialist Agents

Kageyomi runs a coordinated pipeline of six specialist AI agents and one synthesis agent, each calling live SoSoValue data and producing cryptographically signed receipts.

---

### 🔍 Planner (Router)

The entry point of every query. The **Planner** extracts structured intent from free-form natural language — detecting asset symbols (`BTC`, `ETH`, `SOL`), macro events (`CPI`, `FOMC`, `NFP`), treasury tickers (`MSTR`, `TSLA`, `COIN`), and topic keywords. It scores each specialist agent using intent matching, selects the optimal subset to activate, and wires up the parallel execution graph accordingly. In `Auto` mode it routes to the single best agent; in `FullGraph` mode it fans out to all six specialists simultaneously before synthesis.

---

### ⚡ FlowSentinel

**SoSoValue endpoint:** `GET /etfs/summary-history`

The ETF and institutional flow intelligence agent. FlowSentinel queries SoSoValue's Bitcoin ETF aggregate flow history — tracking daily net inflows and outflows across all US spot ETF products (BlackRock IBIT, Fidelity FBTC, and the broader ETF complex). It computes a 7-day net flow aggregate, identifies the directional bias (bullish / bearish / neutral), and surfaces the latest session inflow figure. This agent is the primary signal for detecting early institutional accumulation or distribution pressure before it appears in price.

*Key insight produced:* ETF flow bias over the lookback window, net inflow in USD, latest session change.

---

### 📰 NarrativeScope

**SoSoValue endpoint:** `GET /news/search`

The sentiment and narrative intelligence agent. NarrativeScope queries SoSoValue's curated crypto news feed, analyzes headline and body text for sentiment polarity, and distills the dominant market narrative. It distinguishes between structural sentiment (long-running themes like regulatory clarity or ETF adoption) and noise (short-term FUD). This agent flags emerging narratives early — before they move markets — and scores the overall news sentiment as bullish, bearish, or neutral.

*Key insight produced:* Dominant narrative theme, sentiment score, key headline signals.

---

### 🏛️ TreasuryRadar

**SoSoValue endpoint:** `GET /btc-treasuries/{ticker}/purchase-history`

The corporate Bitcoin accumulation tracker. TreasuryRadar queries historical BTC purchase records for public company treasuries — with MicroStrategy (MSTR) as the default, and TSLA, COIN, and HOOD also supported. It identifies ongoing accumulation campaigns, steady-hold behavior, or periods of inactivity. Corporate treasury activity is a leading indicator for institutional demand floors; TreasuryRadar surfaces whether the "whale of whales" is still buying and at what cadence.

*Key insight produced:* Accumulation vs. steady-hold signal, recent purchase volume, trajectory.

---

### 📊 IndexArb

**SoSoValue endpoint:** `GET /indices/{index_ticker}/market-snapshot`

The relative-value and index performance agent. IndexArb queries SoSoValue's proprietary crypto index snapshots — including **SSI MAG7** (the seven largest crypto assets) and **SSI Layer1** (L1 blockchain performance index). It extracts performance metrics, 24-hour change figures, and cross-index relative value signals. This agent identifies sector rotation opportunities, overperforming or underperforming segments, and arbitrage-like divergences in the crypto capital stack.

*Key insight produced:* Index performance bias, relative value signal vs. BTC, sector momentum.

---

### 🌐 MacroShield

**SoSoValue endpoint:** `GET /macro/events/{event}/history`

The macro event risk modeling agent. MacroShield queries SoSoValue's historical macro event series — CPI prints, FOMC decisions, and Non-Farm Payrolls — and models their observed impact on crypto volatility. It classifies each event's historical surprise factor (hawkish vs. dovish, above/below consensus), identifies upcoming scheduled risk events, and outputs a macro risk level that feeds into the final strategy recommendation. When CPI beats expectations or the Fed turns hawkish, MacroShield catches it first.

*Key insight produced:* Macro surprise classification, risk level (low / medium / high), upcoming event flags.

---

### 🗺️ VentureMap

**SoSoValue endpoint:** `GET /fundraising/projects`

The venture capital and fundraising intelligence agent. VentureMap queries SoSoValue's fundraising project database to surface recent private rounds, active ecosystems, and capital flow trends in the crypto venture space. It identifies which sectors are attracting institutional VC attention (DePIN, RWA, L2s, AI × crypto), tracks token unlock schedules, and detects when VC sell pressure may be incoming. Early-stage funding activity is a leading indicator of ecosystem growth and future retail narrative.

*Key insight produced:* Fundraising activity level, active sectors, VC sentiment signal.

---

### ⚒️ StrategyForge (Synthesis)

The final synthesis agent. StrategyForge receives the canonical signals from all active specialist agents and composes a unified investment-grade research memo. Using **Groq llama-3.3-70b-versatile** for language synthesis, it produces a structured output with: a thesis statement, directional stance (bullish / bearish / neutral), a confidence score, supporting signals from each active agent, identified risk factors, and a recommended next step. This is the output that gets encrypted, committed on-chain, and returned to the user.

---

## Architecture

### Parallel Agent Execution Graph

```
                        ┌─────────────────────────────────────────────────────┐
                        │                  PLANNER (Router)                   │
                        │  • extracts symbol, macro event, treasury ticker     │
                        │  • scores 6 specialists via intent keywords          │
                        │  • selects active agent subset                       │
                        └──────────────┬──────────────────────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────────────────┐
              │             ┌──────────┼───────────┐                        │
              ▼             ▼          ▼           ▼           ▼            ▼
       FlowSentinel  NarrativeScope  TreasuryRadar  IndexArb  MacroShield  VentureMap
           │               │              │           │           │            │
           │  (parallel)   │  (parallel)  │           │           │            │
           └───────────────┴──────────────┴───────────┴───────────┴────────────┘
                                       │
                                       ▼
                               StrategyForge
                        (LLM synthesis on Groq Llama 3.3)
                                       │
                                       ▼
                                 Research Output
```

Each specialist calls a live SoSoValue endpoint, canonicalizes the response (normalized JSON, stripped metadata, 6dp float rounding), and writes a signed **UAVP receipt** to the shared state before passing to StrategyForge.

---

### Confidential Execution Architecture

```
Browser (User)
  │
  ├─ 1. AES-GCM encrypt prompt in-browser
  ├─ 2. CoFHE key split, on-chain ACL permission to quorum addresses
  ├─ 3. Upload encrypted blob → ICL (Inference Coordination Layer)
  │
ICL
  ├─ 4. Assign 1 leader + 2 verifiers from node registry
  ├─ 5. Push encrypted task to each node
  │
Leader Node (Blindference)
  ├─ 6. CoFHE threshold decrypt prompt
  ├─ 7. Call Kageyomi agent service (POST /uavp/execute)
  │       └─ graph.py: planner → [6 agents in parallel] → strategy_forge
  │       └─ Each agent: SoSoValue API call → canonicalize → UAVP receipt
  ├─ 8. Pinata/IPFS: upload receipts → returns receipts_cid
  ├─ 9. Compute: receipt_root (Merkle), output_hash (SHA256), trace_hash
  ├─10. Commit: receipt_root, receipts_cid, output_hash, trace_hash → ICL
  ├─11. (Optional) Post AgentJobMetadata on-chain → PrivateInferenceExtension.sol
  │
Verifier Nodes × 2 (Blindference)
  ├─12. Poll ICL for leader result (receipts_cid, output_hash)
  ├─13. Call Kageyomi replay service (POST /uavp/verify)
  │       └─ Load frozen receipts from IPFS by CID
  │       └─ Reconstruct signals from canonicalData without live API calls
  │       └─ Re-run StrategyForge deterministically
  │       └─ SHA256(replay output) == expected_output_hash → matched: true
  ├─14. Each verifier posts confirmation → ICL quorum
  │
ICL (Quorum Acceptance)
  ├─15. 2/3 verifier confirmations → ACCEPTED
  │
Browser (User)
  └─16. Poll ICL → decrypt AES output locally → display research memo
```

---

### On-Chain Contracts (Arbitrum Sepolia)

| Contract | Address | Purpose |
|---|---|---|
| `PrivateInferenceExtension` | `0x4df4557810d205c6ac4907ea17edcd0309e5314e` | Agent job commitment — anchors `receiptRoot`, `receiptsCID`, `traceHash`, `outputHash` on-chain |
| `DisputeRegistry` | `0xffdea412c82938e5714e9c3de665e809ef53d674` | Handles disputed research job claims |
| `OracleAdapter` | `0x1ecf80171f9a20f25a091de17bf5c3d4eb127347` | On-chain oracle interface for agent output anchoring |
| `ExecutionCommitmentRegistry` | `0x925F42542b2a6b67D76B78b3BFe4127D50b8df81` | Blindference core: quorum execution commitments |
| `PromptKeyStore` | `0x58F07E859555B89CEefDf106aDaA021021cC0580` | FHE key ACL — maps encrypted prompt handles to authorized node addresses |

---

### UAVP: Unified Agent Verification Protocol

Every agent tool call produces a cryptographically signed **receipt**:

```json
{
  "jobId":            "0x...",
  "toolName":         "fetch_ETF_summary_history",
  "toolCallId":       "...",
  "toolArgumentsJson":"{ \"symbol\": \"BTC\", \"limit\": 7 }",
  "paramsHash":       "0x...",
  "responseHash":     "0x...",
  "canonicalData":    "...",
  "timestampMs":      1715600000000,
  "receiptHash":      "0x..."
}
```

All receipts are:
1. **Canonicalized** — wrapper fields stripped, floats normalized to 6dp, keys sorted
2. **Merkle-rooted** — `receipt_root = MerkleRoot(responseHash[])`
3. **Trace-hashed** — `trace_hash = SHA256({promptHash, outputHash, receiptRoot, receiptsCID, model, toolCount})`
4. **Stored on IPFS** via Pinata (with local cache for verifier replay without re-fetching)
5. **Committed on-chain** via `PrivateInferenceExtension.postAgentCommitment()`

Verifiers fetch the **same frozen receipts** by CID from IPFS, reconstruct agent signals from `canonicalData` only (no live API calls), re-run StrategyForge, and check `SHA256(replayed_output) == expected_output_hash`. If they match, the job is verified. This proves the leader did not fabricate or alter the research.

---

## Repository Structure

```
Kageyomi/
├── main.py                          # FastAPI service: /uavp/execute, /uavp/verify, /health
├── kageyomi/
│   ├── agents/
│   │   ├── base.py                  # UAVP tool call wrapper — calls SoSoValue + creates receipt
│   │   ├── flow_sentinel.py         # FlowSentinel agent
│   │   ├── others.py                # NarrativeScope, TreasuryRadar, IndexArb, MacroShield, VentureMap
│   │   └── strategy_forge.py       # StrategyForge synthesis agent (Groq LLM)
│   ├── pipeline/
│   │   ├── graph.py                 # LangGraph StateGraph — parallel agent fan-out + intent routing
│   │   ├── sosovalue_client.py      # SoSoValue HTTP client (rate limiting, cache, retry)
│   │   └── state.py                 # AgentState TypedDict
│   └── uavp/
│       ├── canonicalize.py          # Response normalization for deterministic receipts
│       └── receipt_manager.py       # Receipt creation, Merkle root, IPFS upload/download
├── contracts/kageyomi/src/
│   ├── PrivateInferenceExtension.sol
│   ├── DisputeRegistry.sol
│   └── OracleAdapter.sol
├── frontend/                        # React + Vite chat UI (agent selection, chat history, UAVP panel)
└── scripts/
    ├── run-live-stack.sh            # Start full stack (agent + Blindference quorum + frontend)
    └── stop-live-stack.sh

blindference/wave2_network/
├── packages/
│   ├── icl/                         # Inference Coordination Layer (quorum orchestration)
│   ├── node-reineira/               # Node runtime (leader + verifier roles, Kageyomi bridge)
│   └── frontend/                    # Blindference base frontend (FHE prompt encryption)
└── scripts/demo/
    └── run-stack.sh                 # Start quorum stack
```

---

## Setup & Running

### Prerequisites

- Python 3.12+
- Node.js 20+
- A wallet on Arbitrum Sepolia with testnet ETH
- API keys (see `.env.example`)

### 1. Clone and set up the Blindference quorum stack

> Kageyomi depends on the Blindference Wave 2 node/ICL infrastructure. Clone it into the same parent directory:

```bash
# your workspace should look like:
# dev/
#   Kageyomi/
#   blindference/wave2_network/

cd blindference/wave2_network
cp packages/icl/.env.example packages/icl/.env
# Fill in: PINATA_JWT, ARBITRUM_SEPOLIA_RPC, node wallet private keys
```

### 2. Set up the Kageyomi agent service

```bash
cd Kageyomi

# Create Python virtualenv
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Configure environment
cp .env.example .env
```

**Required `.env` variables:**

```env
# SoSoValue data API
SOSOVALUE_API_KEY=your_key_here
SOSO_BASE_URL=https://api.sosovalue.com

# LLM (StrategyForge synthesis)
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.3-70b-versatile

# IPFS (receipt storage)
PINATA_JWT=your_pinata_jwt
PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs

# Set false for live IPFS, true for local-only testing
KAGEYOMI_MOCK_IPFS=false

# Kageyomi on-chain contract (Arbitrum Sepolia)
KAGEYOMI_EXTENSION_CONTRACT_ADDRESS=0x4df4557810d205c6ac4907ea17edcd0309e5314e
```

### 3. Run the full live stack

```bash
# From the dev/ root (parent of Kageyomi/ and blindference/)
bash Kageyomi/scripts/run-live-stack.sh
```

This starts:
| Service | URL |
|---|---|
| Kageyomi Agent Service | `http://127.0.0.1:8001` |
| Blindference ICL | `http://127.0.0.1:8000` |
| Leader Node | internal |
| Verifier 1 | internal |
| Verifier 2 | internal |
| Kageyomi Frontend | `http://127.0.0.1:3000` |

```bash
# Stop everything
bash Kageyomi/scripts/stop-live-stack.sh

# Check status
bash Kageyomi/scripts/status-live-stack.sh
```

### 4. Logs

```bash
# Agent execution log
tail -f Kageyomi/scripts/logs/agent.log

# ICL / quorum coordination
tail -f blindference/wave2_network/scripts/demo/logs/icl.log

# Node execution
tail -f blindference/wave2_network/scripts/demo/logs/node-leader.log
tail -f blindference/wave2_network/scripts/demo/logs/node-verifier1.log
tail -f blindference/wave2_network/scripts/demo/logs/node-verifier2.log
```

### 5. Standalone agent smoke test (without Blindference)

```bash
# Start just the Kageyomi agent
source .venv/bin/activate
uvicorn main:app --port 8001 --reload

# Test execute
curl -X POST http://localhost:8001/uavp/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What do BTC ETF flows tell us about macro risk?", "agent": "FullGraph"}'

# Verify (use receipts_cid from execute response)
curl -X POST http://localhost:8001/uavp/verify \
  -H "Content-Type: application/json" \
  -d '{"receipts_cid": "...", "prompt": "...", "expected_output_hash": "..."}'
```

---

## How a Research Query Works: End to End

1. **User opens** `http://127.0.0.1:3000`, connects MetaMask (Arbitrum Sepolia)
2. **Types a query** e.g. *"Analyze MSTR accumulation pattern against macro risk"*
3. **Browser encrypts** the prompt with AES-GCM; the key is split and permissioned via CoFHE on-chain ACL
4. **ICL assigns** a leader + 2 verifiers from the registered node pool
5. **Leader node** decrypts the prompt via CoFHE threshold network
6. **Kageyomi graph executes:**
   - Planner identifies: TreasuryRadar + MacroShield as primary agents
   - Both run in parallel, each calling live SoSoValue endpoints
   - Each call produces a UAVP receipt (canonicalized, hashed, signed)
   - StrategyForge synthesizes signals into a structured research memo via Groq Llama 3.3
7. **Receipts** are uploaded to IPFS via Pinata; `receipt_root`, `output_hash`, `trace_hash` computed
8. **Leader commits** result to ICL; optionally anchors `AgentJobMetadata` on-chain
9. **Verifiers** load frozen receipts by CID, replay deterministically, confirm `matched: true`
10. **ICL accepts** the job (2/3 quorum)
11. **Browser polls**, decrypts the output locally, renders the markdown research memo with UAVP proof panel

---

## Architecture Paper (Draft)

This project is built on the Blindference architecture — a verifiable inference quorum protocol developed for the Reineira × Fhenix Buildathon.

📄 **[Read the Blindference Architecture Paper](https://ivory-late-quokka-745.mypinata.cloud/ipfs/bafybeicnnfmvj6xt2w2dhvv6idfxje3fvtgu7ngbwmreknn53utneomezy)**

The paper describes the Unified Agent Verification Protocol (UAVP), the receipt Merkle commitment scheme, the frozen-context verifier replay mechanism, and the CoFHE threshold key permission model that Kageyomi implements as a production application layer.

---

## Acknowledgements

- **[SoSoValue](https://sosovalue.com)** — for the comprehensive crypto market data API powering all six specialist agents
- **[Fhenix](https://fhenix.zone)** — for CoFHE, enabling true on-chain FHE key permissioning for confidential AI inference
- **[Reineira](https://reineira.xyz)** — for the UAVP verification framework and buildathon infrastructure
- **[Groq](https://groq.com)** — for the ultra-low-latency LLM inference powering StrategyForge
- **[Pinata](https://pinata.cloud)** — for decentralized IPFS receipt storage
- **[LangGraph](https://github.com/langchain-ai/langgraph)** — for the parallel multi-agent state graph execution

---

<div align="center">

Built with 影 by the Kageyomi team Buildathon 2026

</div>
