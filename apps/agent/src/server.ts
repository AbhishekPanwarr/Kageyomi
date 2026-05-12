import express from 'express'

import { runAgentJob } from './agent/groq-agent.js'
import { verifyAgentJob } from './verifier/replay.js'

const app = express()
const port = Number(process.env.KAGEYOMI_AGENT_PORT || 3001)
const host = process.env.KAGEYOMI_AGENT_HOST || '127.0.0.1'

app.use(express.json({ limit: '1mb' }))

app.get('/health', (_request, response) => {
  response.json({ ok: true })
})

app.post('/uavp/execute', async (request, response) => {
  const prompt = typeof request.body?.prompt === 'string' ? request.body.prompt.trim() : ''
  if (!prompt) {
    response.status(400).json({ error: 'prompt is required' })
    return
  }

  try {
    const result = await runAgentJob(prompt)
    response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    response.status(500).json({ error: message })
  }
})

app.post('/uavp/verify', async (request, response) => {
  const receiptsCID = typeof request.body?.receiptsCID === 'string' ? request.body.receiptsCID.trim() : ''
  const prompt = typeof request.body?.prompt === 'string' ? request.body.prompt.trim() : ''
  const expectedOutputHash =
    typeof request.body?.expectedOutputHash === 'string' ? request.body.expectedOutputHash.trim() : ''

  if (!receiptsCID || !prompt || !expectedOutputHash) {
    response.status(400).json({ error: 'receiptsCID, prompt, and expectedOutputHash are required' })
    return
  }

  try {
    const matched = await verifyAgentJob(receiptsCID, prompt, expectedOutputHash)
    response.json({ matched })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    response.status(500).json({ error: message })
  }
})

app.listen(port, host, () => {
  process.stdout.write(`Kageyomi UAVP Agent listening on ${host}:${port}\n`)
})
