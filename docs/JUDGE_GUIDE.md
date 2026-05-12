# Kageyomi Judge Guide

## What To Look For

Kageyomi is a confidential research terminal for SoSoValue data. The important thing to notice is that verifier nodes do not re-fetch live API data during replay. They consume the frozen canonical receipts the leader already committed to, which keeps the final output hash stable across honest nodes.

## Happy-Path Demo

1. Run `bash Kageyomi/scripts/deploy-with-blindference.sh` once.
2. Run `bash Kageyomi/scripts/run-live-stack.sh`.
3. Open the frontend at `http://127.0.0.1:3000`.
4. Submit a query such as `BTC ETF inflow vs CPI surprises + institutional news sentiment`.
5. Watch the status panel progress through encryption, SoSoValue fetches, canonicalization, verifier replay, and on-chain trace anchoring.
6. Inspect the UAVP metadata fields on the status page.
7. Click through local decryption and confirm plaintext only appears after verification.

## Core Proof Points

- Prompts are encrypted before execution.
- SoSoValue responses are canonicalized into deterministic receipts.
- The final Groq answer is bound to a `traceHash`, `receiptRoot`, and `receiptsCID`.
- Agent metadata is anchored on-chain through `PrivateInferenceExtension.sol`.
- Verifiers reproduce the same `outputHash` from frozen receipts, not from live API drift.

## Known Demo Constraints

- The current live submission flow uses the Blindference frontend in Kageyomi agent mode because that already owns the wallet, CoFHE, and `PromptKeyStore` browser flow.
- The on-chain registry is a companion UAVP metadata contract, while Blindference's existing commitment registry still handles quorum commitments.
- Mock cached SoSoValue data is included for rate-limit-safe demos.

## Recommended Validation Commands

```bash
cd Kageyomi
npm run typecheck
npm run build

cd contracts/kageyomi
forge build

cd ../..
python3 scripts/test-uavp-integration.py
```

## Wave 2 Direction

- Production dispute routing
- Oracle-backed receipt arbitration
- Full live frontend state polling against deployed services
