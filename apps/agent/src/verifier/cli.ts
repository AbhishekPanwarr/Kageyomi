import { verifyAgentJob } from './replay.js'

async function main() {
  const [receiptsCID, prompt, expectedOutputHash] = process.argv.slice(2)
  if (!receiptsCID || !prompt || !expectedOutputHash) {
    throw new Error('Usage: verify-cli <receiptsCID> <prompt> <expectedOutputHash>')
  }

  const matched = await verifyAgentJob(receiptsCID, prompt, expectedOutputHash)
  process.stdout.write(`${JSON.stringify({ matched })}\n`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
