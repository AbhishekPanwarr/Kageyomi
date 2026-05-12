# Kageyomi Wave 1 Demo Script

## 0:00-0:20 Intro

- Show Kageyomi as a confidential signal terminal.
- Narration: "Kageyomi lets analysts query SoSoValue's institutional data privately."
- Enter query: `Correlation between BTC ETF inflows and CPI surprises over last 7 days`
- Trigger confidential analysis.

## 0:20-0:50 Encrypted Query + API Fetch

- Show the encrypted request lifecycle and real or cached SoSoValue fetches.
- Highlight canonicalization and signed receipt generation.
- Show the uploaded receipts CID and the on-chain agent commitment transaction.

## 0:50-1:20 Quorum Verification

- Switch to verifier output and show replay against frozen canonical data.
- Confirm `2/3 commitments match` and that the job reaches verified state.
- Point to the `AgentJobSubmitted` metadata anchor.

## 1:20-1:45 Encrypted Output + Decryption

- Return to the UI and show the encrypted insight ready state.
- Decrypt locally and reveal the plaintext result.
- Narration: "Plaintext never left the device. Strategy never leaks."

## 1:45-2:00 Close

- Show the trace hash and receipts CID.
- Recap: verifiers replay frozen context, not live APIs.
- End on repo link and submission reminder.
