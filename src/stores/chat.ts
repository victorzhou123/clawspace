import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Message } from '@/types/chat'
import { chatHistory, chatSend, chatAbort } from '@/api/chat'
import { subscribe, unsubscribe } from '@/api/websocket'
import { logger } from '@/utils/logger'

const TAG = 'chatStore'

// 从后端消息对象提取内容
function extractMessageContent(msg: Record<string, unknown>): string | unknown[] {
  if (typeof msg.text === 'string') return msg.text
  if (typeof msg.content === 'string') return msg.content
  if (Array.isArray(msg.content)) return msg.content
  return ''
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const sending = ref(false)
  const streaming = ref(false)
  const currentSessionId = ref<string | null>(null)
  const historyLimit = ref(50)
  const hasMore = ref(false)
  const pendingRunId = ref<string | null>(null)
  const startTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null)

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
      .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'toolResult')
      .map((m, i) => ({
        id: (m.id as string | undefined) ?? `hist-${i}`,
        role: m.role as 'user' | 'assistant' | 'toolResult',
        content: extractMessageContent(m),
        timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now(),
        status: 'sent' as const,
        toolCallId: m.toolCallId as string | undefined,
        toolName: m.toolName as string | undefined,
        isError: m.isError as boolean | undefined,
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
      const result = await chatSend(sessionKey, content) as { runId?: string }
      _updateMessage(msgId, { status: 'sent' })

      // 启动 20 秒超时检测
      if (result.runId) {
        pendingRunId.value = result.runId
        if (startTimeoutId.value) clearTimeout(startTimeoutId.value)
        startTimeoutId.value = setTimeout(() => {
          // 20 秒内没收到 start 事件，显示错误
          if (pendingRunId.value === result.runId) {
            uni.showToast({ title: '响应超时', icon: 'none' })
            pendingRunId.value = null
          }
        }, 20000)
      }
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
    const onAgentEvent = (data: unknown) => {
      const d = data as Record<string, unknown>
      if (d.sessionKey !== sessionKey) return

      const stream = d.stream as string | undefined
      const payload = d.data as Record<string, unknown> | undefined
      const runId = (d.runId as string | undefined) ?? 'stream-current'

      if (stream === 'lifecycle' && payload?.phase === 'start') {
        // 收到 start 事件，取消超时并添加 loading 消息
        if (pendingRunId.value === runId && startTimeoutId.value) {
          clearTimeout(startTimeoutId.value)
          startTimeoutId.value = null
          pendingRunId.value = null
        }

        const idx = messages.value.findIndex(m => m.id === runId)
        if (idx === -1) {
          messages.value.push({
            id: runId,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            isLoading: true,
          })
        }
      } else if (stream === 'lifecycle' && payload?.phase === 'error') {
        // 收到 error 事件，显示错误消息
        const errorMsg = (payload.error as string) || '发生错误'
        const idx = messages.value.findIndex(m => m.id === runId)
        if (idx !== -1) {
          messages.value[idx] = {
            ...messages.value[idx],
            content: errorMsg,
            isLoading: false,
            isStreaming: false,
            status: 'error',
          }
        } else {
          messages.value.push({
            id: runId,
            role: 'assistant',
            content: errorMsg,
            timestamp: Date.now(),
            status: 'error',
          })
        }
      } else if (stream === 'lifecycle' && payload?.phase === 'end') {
        // end 事件不需要特殊处理
      }
    }

    const onChatEvent = (data: unknown) => {
      const d = data as Record<string, unknown>
      if (d.sessionKey !== sessionKey) return

      const state = d.state as string | undefined
      const msgId = (d.runId as string | undefined) ?? 'stream-current'

      if (state === 'delta') {
        streaming.value = true
        const msg = d.message as Record<string, unknown> | undefined
        const content = extractMessageContent(msg ?? {})
        const idx = messages.value.findIndex(m => m.id === msgId)
        if (idx === -1) {
          messages.value.push({
            id: msgId,
            role: 'assistant',
            content,
            timestamp: Date.now(),
            isStreaming: true,
          })
        } else {
          messages.value[idx].content = content
          messages.value[idx].isLoading = false
          messages.value[idx].isStreaming = true
        }
      } else if (state === 'final') {
        streaming.value = false
        const msg = d.message as Record<string, unknown> | undefined
        const idx = messages.value.findIndex(m => m.id === msgId)

        if (idx !== -1) {
          // 如果是 loading 状态且没有 delta 消息，说明需要重新加载历史
          if (messages.value[idx].isLoading && !msg) {
            messages.value.splice(idx, 1)
            loadHistory(sessionKey).catch(e => logger.error(TAG, 'loadHistory on final failed', e))
          } else {
            const finalContent = msg ? extractMessageContent(msg) : messages.value[idx].content
            messages.value[idx] = {
              ...messages.value[idx],
              content: finalContent,
              isStreaming: false,
              isLoading: false,
              status: 'sent',
            }
          }
        } else {
          // 没有收到 delta 事件，重新加载历史消息
          loadHistory(sessionKey).catch(e => logger.error(TAG, 'loadHistory on final failed', e))
        }
      } else if (state === 'aborted' || state === 'error') {
        streaming.value = false
        _updateMessage(msgId, { isStreaming: false, isLoading: false, status: state === 'error' ? 'error' : 'sent' })
      }
    }

    subscribe('agent', onAgentEvent)
    subscribe('chat', onChatEvent)

    return () => {
      if (startTimeoutId.value) {
        clearTimeout(startTimeoutId.value)
        startTimeoutId.value = null
      }
      unsubscribe('agent', onAgentEvent)
      unsubscribe('chat', onChatEvent)
    }
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
