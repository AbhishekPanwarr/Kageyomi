import { useCallback, useEffect, useRef, useState } from 'react'
import { type ChatEntry } from '../components/inference/ChatView'
import { useInferenceStatus } from './useInferenceStatus'
import { useCofheClient } from './useCofheClient'
import { decryptOutputKey, downloadAndDecryptTextOutput } from '../utils/textPromptKey'

function uid() { return Math.random().toString(36).slice(2) }

export function useChat() {
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [activeRequestId, setActiveRequestId] = useState('')
  const { client: cofheClient, isReady } = useCofheClient()
  const decryptedIds = useRef<Set<string>>(new Set())

  const status = useInferenceStatus(activeRequestId)

  // Update the pending assistant message when job status changes
  useEffect(() => {
    if (!activeRequestId || !status) return
    setMessages(prev => prev.map(m => {
      if (m.role !== 'assistant' || m.requestId !== activeRequestId || m.status === 'done' || m.status === 'error') return m
      const next: ChatEntry = { ...m }
      if (status.status === 'QUEUED' || status.status === 'ASSIGNED' || status.status === 'EXECUTING') {
        next.status = 'processing'
      }
      if (status.quorum.leader) next.requestId = activeRequestId
      return next
    }))
  }, [activeRequestId, status?.status])

  // Auto-decrypt when ACCEPTED
  useEffect(() => {
    if (!status || status.status !== 'ACCEPTED' || status.mode !== 'text') return
    const { encrypted_output_key_high: high, encrypted_output_key_low: low, output_cid } = status.text_result ?? {}
    if (!high || !low || !output_cid || !cofheClient || !isReady) return
    if (decryptedIds.current.has(activeRequestId)) return
    decryptedIds.current.add(activeRequestId)

    const rid = activeRequestId;
    (async () => {
      try {
        const key = await decryptOutputKey(cofheClient, high, low)
        const answer = await downloadAndDecryptTextOutput(output_cid, key)
        setMessages(prev => prev.map(m =>
          m.role === 'assistant' && m.requestId === rid
            ? { ...m, status: 'done', content: answer, uavp: status.uavp ?? undefined }
            : m
        ))
      } catch (e) {
        setMessages(prev => prev.map(m =>
          m.role === 'assistant' && m.requestId === rid
            ? { ...m, status: 'error', errorMsg: e instanceof Error ? e.message : 'Decryption failed' }
            : m
        ))
      }
    })()
  }, [status?.status, status?.text_result?.output_cid, cofheClient, isReady, activeRequestId])

  const pushUserMessage = useCallback((prompt: string, agent: string, model: string): string => {
    const userId = uid()
    const assistantId = uid()
    setMessages(prev => [
      ...prev,
      { id: userId, role: 'user', content: prompt, agent, model, status: 'done', timestamp: new Date() },
      { id: assistantId, role: 'assistant', content: '', agent, model, status: 'encrypting', timestamp: new Date() },
    ])
    return assistantId
  }, [])

  const updateAssistantStatus = useCallback((assistantId: string, status: ChatEntry['status'], requestId?: string) => {
    setMessages(prev => prev.map(m =>
      m.id === assistantId ? { ...m, status, ...(requestId ? { requestId } : {}) } : m
    ))
  }, [])

  const failAssistantMessage = useCallback((assistantId: string, errorMsg: string) => {
    setMessages(prev => prev.map(m =>
      m.id === assistantId ? { ...m, status: 'error', errorMsg } : m
    ))
  }, [])

  return { messages, pushUserMessage, updateAssistantStatus, failAssistantMessage, setActiveRequestId, status }
}
