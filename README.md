# Kageyomi

Confidential crypto research on SoSoValue, powered by Fhenix-backed encrypted inference and UAVP verification.

## Overview

Kageyomi is a confidential research terminal for crypto analysts.

It lets a user:

- submit an encrypted natural-language query
- route that query through a leader-plus-verifier inference quorum
- run SoSoValue-backed agent research without exposing the prompt in plaintext
- freeze every external tool response into canonical receipts
- replay the exact research context for deterministic verification
- decrypt the final result locally after verification succeeds

The core problem Kageyomi solves is simple:

tool-using AI agents are hard to verify when they depend on live APIs, because different nodes can see slightly different data at different times.

Kageyomi solves this with UAVP:

- the leader canonicalizes every SoSoValue response
- each tool call becomes a signed receipt
- receipts are hashed into a Merkle root
- the full receipt set is pinned to IPFS
- verifiers replay from the frozen receipts, not from live API calls

That makes confidential, tool-using inference reproducible enough for quorum verification.

## What We Built

Kageyomi currently includes:

- a connected Kageyomi frontend in [frontend/](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/frontend)
- a FastAPI UAVP agent service in [main.py](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/main.py)
- a LangGraph-based multi-agent research pipeline in [kageyomi/pipeline/graph.py](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/kageyomi/pipeline/graph.py)
- live SoSoValue integration with rate limiting in [kageyomi/pipeline/sosovalue_client.py](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/kageyomi/pipeline/sosovalue_client.py)
- deterministic canonicalization in [kageyomi/uavp/canonicalize.py](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/kageyomi/uavp/canonicalize.py)
- ToolReceipt hashing, signing, IPFS persistence, Merkle root generation, and trace hashing in [kageyomi/uavp/receipt_manager.py](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/kageyomi/uavp/receipt_manager.py)
- a Fhenix-compatible metadata registry contract set in [contracts/kageyomi/src/](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/contracts/kageyomi/src)
- local orchestration scripts in [scripts/](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/scripts)

## Architecture

```text
User Browser
  -> AES-256-GCM encrypts the prompt locally
  -> Prompt ciphertext is uploaded
  -> Prompt key halves are protected with Fhenix CoFHE permissions
  -> Confidential inference coordinator assigns:
       1 leader + 2 verifiers

Leader Node
  -> Decrypts the prompt key through Fhenix permissions
  -> Calls Kageyomi /uavp/execute
  -> LangGraph planner activates the right research agents
  -> Agents call SoSoValue endpoints
  -> Every response is canonicalized into a UAVP receipt
  -> StrategyForge synthesizes the final research memo
  -> Leader computes:
       outputHash
       receiptRoot
       receiptsCID
       traceHash

Verifier Nodes
  -> Fetch receipts from receiptsCID
  -> Reconstruct the same signal state from frozen canonical receipts
  -> Re-run StrategyForge synthesis
  -> Compare replayed output hash to expected output hash

On-Chain Metadata
  -> receiptRoot
  -> receiptsCID
  -> traceHash
  -> outputHash

User Browser
  -> Polls job state
  -> Decrypts the verified result locally
```

## Confidential Inference Stack

Kageyomi uses Fhenix-compatible confidential inference primitives:

- CoFHE-based key protection for prompt and output access
- local AES-256-GCM prompt encryption
- quorum-based leader/verifier execution
- on-chain metadata anchoring for replay artifacts

The frontend never sends plaintext prompt content over the network.

The verifier path does not query live SoSoValue during replay.

## UAVP Verification Model

Each SoSoValue tool call is transformed into a deterministic receipt with:

- `jobId`
- `toolName`
- `toolCallId`
- `toolArgumentsJson`
- `paramsHash`
- `responseHash`
- `canonicalData`
- `dataType`
- `timestampMs`
- `receiptHash`
- optional `signature`

The receipt pipeline is:

1. fetch live SoSoValue data
2. strip ephemeral fields
3. normalize floats
4. serialize deterministically
5. hash the canonical payload
6. sign the receipt
7. persist the full receipt list to IPFS and local cache
8. compute `receiptRoot`
9. compute `traceHash`

Verifier replay reconstructs the final answer from the frozen receipt set rather than from live external data.

## Research Modes and Agents

Kageyomi exposes 7 research modes in the UI:

1. `FullGraph`
2. `FlowSentinel`
3. `NarrativeScope`
4. `TreasuryRadar`
5. `IndexArb`
6. `MacroShield`
7. `VentureMap`

Important note:

- `FullGraph` is the orchestration mode
- it activates the specialist agents in parallel and then passes their signals into `StrategyForge`
- `StrategyForge` is the synthesis layer, not a separate UI mode

### Agent Details

#### `FullGraph`

The default orchestration mode.

It uses the planner to infer:

- symbol
- macro event
- treasury ticker
- news keyword
- index ticker

It then activates the relevant specialist agents and synthesizes one final memo.

#### `FlowSentinel`

Source: [kageyomi/agents/flow_sentinel.py](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/kageyomi/agents/flow_sentinel.py)

Purpose:

- institutional ETF flow analysis
- directional bias from recent aggregate net inflow history

SoSoValue endpoint:

- `/etfs/summary-history`

Output focus:

- lookback flow bias
- latest session inflow
- ETF flow momentum

#### `NarrativeScope`

Source: [kageyomi/agents/others.py](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/kageyomi/agents/others.py)

Purpose:

- crypto news and narrative sentiment analysis

SoSoValue endpoint:

- `/news/search`

Output focus:

- article count
- top headlines
- positive / negative / neutral narrative bias

#### `TreasuryRadar`

Purpose:

- public-company Bitcoin treasury tracking

SoSoValue endpoint:

- `/btc-treasuries/{ticker}/purchase-history`

Output focus:

- latest treasury purchase date
- BTC acquired
- total holdings
- accumulation vs steady behavior

#### `IndexArb`

Purpose:

- relative-value and index dislocation analysis

SoSoValue endpoint:

- `/indices/{index_ticker}/market-snapshot`

Output focus:

- 24h change
- 7-day ROI
- 1-month ROI
- outperforming vs mixed regime

#### `MacroShield`

Purpose:

- macro event surprise and risk interpretation

SoSoValue endpoint:

- `/macro/events/{event}/history`

Output focus:

- actual vs forecast surprise
- macro risk level
- event-driven caution signal

#### `VentureMap`

Purpose:

- venture and fundraising intelligence

SoSoValue endpoint:

- `/fundraising/projects`

Output focus:

- visible fundraising activity
- sample project set
- current venture map summary

#### `StrategyForge`

Source: [kageyomi/agents/strategy_forge.py](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/kageyomi/agents/strategy_forge.py)

Purpose:

- synthesize specialist outputs into one structured research memo

Runtime behavior:

- uses Groq through `langchain_groq` when `GROQ_API_KEY` is present
- falls back to a deterministic rule-based synthesis path when mocked

Output shape:

- `selectedAgent`
- `activeAgents`
- `stance`
- `confidence`
- `thesis`
- `supportingSignals`
- `risks`
- `nextStep`

## Supported SoSoValue Data Sources

The current implementation integrates these SoSoValue surfaces:

- ETF summary history
- crypto news search
- BTC treasury purchase history
- SoSoValue index market snapshots
- macro event history
- fundraising projects

The client is rate-limited to the SoSoValue demo constraint:

- `SOSO_REQUESTS_PER_MINUTE=10`

## API Surface

The Kageyomi service exposes:

### `POST /uavp/execute`

Runs the selected research mode and returns:

- output
- output hash
- receipt root
- receipts CID
- trace hash
- receipts
- reasoning steps
- active agents

### `POST /uavp/verify`

Loads the frozen receipts, replays the synthesis step, and returns:

- whether the replay matched
- replayed output hash
- active agents involved in replay

### `GET /health`

Basic service health check.

## Repository Structure

```text
Kageyomi/
├── main.py                      # FastAPI entrypoint
├── kageyomi/
│   ├── agents/
│   │   ├── base.py
│   │   ├── flow_sentinel.py
│   │   ├── others.py
│   │   └── strategy_forge.py
│   ├── pipeline/
│   │   ├── graph.py
│   │   └── sosovalue_client.py
│   ├── uavp/
│   │   ├── canonicalize.py
│   │   └── receipt_manager.py
│   └── state.py
├── frontend/                    # connected Kageyomi UI
├── contracts/kageyomi/          # metadata registry and dispute contracts
├── scripts/                     # deploy/run/stop/status helpers
└── docs/
```

## Contracts

The contract package currently includes:

- `PrivateInferenceExtension.sol`
- `DisputeRegistry.sol`
- `OracleAdapter.sol`

These contracts are used to anchor UAVP metadata and support dispute-oriented extensions for later phases.

## Local Prerequisites

Before running locally, make sure you have:

- Node.js 20+
- Python 3.11+
- Foundry
- a funded testnet wallet for deployment steps
- a SoSoValue API key
- a Groq API key
- a Pinata JWT for IPFS receipt uploads

## Environment Setup

Copy and fill:

- [Kageyomi/.env.example](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/.env.example)
- [Kageyomi/frontend/.env.example](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/frontend/.env.example)

Minimum backend values:

```env
SOSOVALUE_API_KEY=...
GROQ_API_KEY=...
NODE_PRIVATE_KEY=...
PINATA_JWT=...
SOSO_REQUESTS_PER_MINUTE=10
GROQ_MODEL=llama-3.3-70b-versatile
```

Minimum frontend values:

```env
VITE_ICL_API_URL=http://127.0.0.1:8000
VITE_PROMPT_KEY_STORE_ADDRESS=0x...
VITE_KAGEYOMI_EXTENSION_CONTRACT_ADDRESS=0x...
VITE_KAGEYOMI_AGENT_MODE=true
```

## How To Run Locally

### 1. Install frontend dependencies

```bash
cd Kageyomi/frontend
npm install
```

### 2. Install contract dependencies

```bash
cd Kageyomi/contracts/kageyomi
npm install
```

### 3. Create the Python environment

```bash
cd Kageyomi
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn httpx langgraph langchain-groq eth-account python-dotenv
```

### 4. Deploy the local testnet stack

Use the deployment helper:

```bash
bash Kageyomi/scripts/deploy-fhenix-stack.sh
```

### 5. Start the full local system

```bash
bash Kageyomi/scripts/run-live-stack.sh
```

This starts:

- Kageyomi frontend on `http://127.0.0.1:3000`
- confidential inference coordinator on `http://127.0.0.1:8000`
- Kageyomi UAVP service on `http://127.0.0.1:8001`
- leader node
- verifier 1 node
- verifier 2 node

### 6. Monitor or stop the stack

```bash
bash Kageyomi/scripts/status-live-stack.sh
bash Kageyomi/scripts/stop-live-stack.sh
```

## Standalone Agent Smoke Test

If you want to validate the agent layer before running the full encrypted stack:

```bash
cd Kageyomi
python3 -m uvicorn main:app --host 127.0.0.1 --port 8001
```

Then call:

```bash
curl -X POST http://127.0.0.1:8001/uavp/execute \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "BTC ETF inflow vs CPI surprises and latest ETF news sentiment",
    "agent": "FullGraph",
    "model_cid": "llama-3.3-70b-versatile",
    "max_tools": 6
  }'
```

## Frontend Flow

The Kageyomi frontend does the following:

- initializes the wallet and CoFHE client
- encrypts the prompt locally
- stores prompt key routing in `PromptKeyStore`
- uploads the encrypted prompt blob
- submits a confidential text research job
- polls job status
- displays UAVP metadata when available
- decrypts the final answer locally

## Logs

Kageyomi writes application logs to:

- [Kageyomi/scripts/logs/](/home/abhieren/Drive/Projects/Buildathon/SoSoValue/dev/Kageyomi/scripts/logs)

The confidential inference coordinator and node processes also emit their own local demo logs when the full stack is launched through `run-live-stack.sh`.

## Current Implementation Status

As of now, the implemented state includes:

- connected Kageyomi frontend
- Fhenix-compatible encrypted prompt flow
- live SoSoValue agent execution
- LangGraph orchestration
- UAVP canonical receipts
- IPFS receipt persistence
- deterministic verifier replay from frozen context
- metadata hashing and anchoring contracts
- local multi-node quorum run scripts

## Notes

- `FullGraph` is the recommended default mode.
- `KAGEYOMI_MOCK_GROQ=true` enables deterministic fallback synthesis.
- `KAGEYOMI_MOCK_IPFS=true` stores receipt payloads locally instead of pinning.
- `KAGEYOMI_USE_MOCK_SOSO=true` enables mock SoSoValue mode for demo-only testing.

## License / Project Status

Kageyomi is currently a buildathon-stage confidential research system and should be treated as research infrastructure, not financial advice or production trading software.
