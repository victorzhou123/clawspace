import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Message } from '@/types/chat'
import { chatHistory, chatSend, chatAbort } from '@/api/chat'
import { subscribe, unsubscribe } from '@/api/websocket'
import { logger } from '@/utils/logger'

const TAG = 'chatStore'

// 从后端消息对象提取文本内容
function extractMessageText(msg: Record<string, unknown>): string {
  if (typeof msg.text === 'string') return msg.text
  if (typeof msg.content === 'string') return msg.content
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((b: unknown) => b && typeof b === 'object' && (b as Record<string, unknown>).type === 'text')
      .map((b: unknown) => (b as Record<string, unknown>).text as string)
      .join('\n')
  }
  return ''
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const sending = ref(false)
  const streaming = ref(false)
  const currentSessionId = ref<string | null>(null)
  const historyLimit = ref(50)
  const hasMore = ref(false)

  async function loadHistory(sessionKey: string) {
    historyLimit.value = 50
    const result = await chatHistory(sessionKey, historyLimit.value) as { messages?: unknown[] }
    const rawMessages = result.messages ?? []
    messages.value = _parseMessages(rawMessages)
    hasMore.value = rawMessages.length >= historyLimit.value
    currentSessionId.value = sessionKey
  }

  async function loadMore(sessionKey: string) {
    historyLimit.value += 50
    const result = await chatHistory(sessionKey, historyLimit.value) as { messages?: unknown[] }
    const rawMessages = result.messages ?? []
    messages.value = _parseMessages(rawMessages)
    hasMore.value = rawMessages.length >= historyLimit.value
  }

  function _parseMessages(rawMessages: unknown[]): Message[] {
    return rawMessages
      .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map((m, i) => ({
        id: (m.id as string | undefined) ?? `hist-${i}`,
        role: m.role as 'user' | 'assistant',
        content: extractMessageText(m),
        timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now(),
        status: 'sent' as const,
      }))
  }

  async function sendMessage(sessionKey: string, content: string) {
    const msgId = `local-${Date.now()}`
    const userMsg: Message = {
      id: msgId,
      role: 'user',
      content,
      timestamp: Date.now(),
      status: 'sending',
    }
    messages.value.push(userMsg)
    sending.value = true
    try {
      await chatSend(sessionKey, content)
      _updateMessage(msgId, { status: 'sent' })
    } catch (e) {
      _updateMessage(msgId, { status: 'error' })
      logger.error(TAG, 'sendMessage failed', e)
      throw e
    } finally {
      sending.value = false
    }
  }

  async function abortMessage(sessionKey: string) {
    await chatAbort(sessionKey)
    streaming.value = false
  }

  function clearMessages() {
    messages.value = []
    currentSessionId.value = null
  }

  /**
   * 订阅流式消息推送，返回取消订阅函数
   * 后端推送事件：chat { runId, sessionKey, seq, state, message, errorMessage }
   * state: 'delta' | 'final' | 'aborted' | 'error'
   */
  function subscribeStream(sessionKey: string): () => void {
    const onChatEvent = (data: unknown) => {
      const d = data as Record<string, unknown>
      if (d.sessionKey !== sessionKey) return

      const state = d.state as string | undefined
      const msgId = (d.runId as string | undefined) ?? 'stream-current'

      if (state === 'delta') {
        streaming.value = true
        const msg = d.message as Record<string, unknown> | undefined
        // delta 携带的是累积全文，直接替换而非追加
        const text = extractMessageText(msg ?? {})
        const idx = messages.value.findIndex(m => m.id === msgId)
        if (idx === -1) {
          messages.value.push({
            id: msgId,
            role: 'assistant',
            content: text,
            timestamp: Date.now(),
            isStreaming: true,
          })
        } else {
          // 直接修改属性，避免替换整个对象触发深度响应式更新
          messages.value[idx].content = text
        }
      } else if (state === 'final') {
        streaming.value = false
        const msg = d.message as Record<string, unknown> | undefined
        const idx = messages.value.findIndex(m => m.id === msgId)
        if (idx !== -1) {
          const finalText = msg ? extractMessageText(msg) : messages.value[idx].content
          messages.value[idx] = {
            ...messages.value[idx],
            content: finalText,
            isStreaming: false,
            status: 'sent',
          }
        }
      } else if (state === 'aborted' || state === 'error') {
        streaming.value = false
        _updateMessage(msgId, { isStreaming: false, status: state === 'error' ? 'error' : 'sent' })
      }
    }

    subscribe('chat', onChatEvent)
    return () => unsubscribe('chat', onChatEvent)
  }

  function _updateMessage(id: string, patch: Partial<Message>) {
    const idx = messages.value.findIndex(m => m.id === id)
    if (idx !== -1) {
      messages.value[idx] = { ...messages.value[idx], ...patch }
    }
  }

  return {
    messages,
    sending,
    streaming,
    hasMore,
    currentSessionId,
    loadHistory,
    loadMore,
    sendMessage,
    abortMessage,
    clearMessages,
    subscribeStream,
  }
})
