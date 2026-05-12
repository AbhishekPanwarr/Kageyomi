# Judge Guide

## What To Look For

- Confidential prompt flow
- SoSoValue-backed receipt generation
- Frozen-context verifier replay
- On-chain trace metadata anchored through `PrivateInferenceExtension.sol`
- Local-only output decrypt step

## Recommended Demo Path

1. Start the Python bridge in `apps/agent-py`
2. Start the Blindference ICL stack
3. Open the web app and run the seeded ETF + CPI query
4. Open the receipts modal and inspect canonicalized tool outputs
5. Confirm the agent commitment transaction on the metadata registry

## Known Limits

- Frontend currently uses a demo-mode state machine for Wave 1 presentation
- Dispute flow is mocked and intended for presentation, not production settlement
- Live deploy and explorer verification require valid Fhenix credentials

## Wave 2 Direction

- Live contract polling in the web app
- Production dispute resolution path
- SoDEX execution handoff
