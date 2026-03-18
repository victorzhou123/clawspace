import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Message } from '@/types/chat'
import { chatHistory, chatSend, chatAbort } from '@/api/chat'
import { subscribe, unsubscribe } from '@/api/websocket'
import { logger } from '@/utils/logger'

const TAG = 'chatStore'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const sending = ref(false)
  const streaming = ref(false)
  const currentSessionId = ref<string | null>(null)

  async function loadHistory(sessionId: string) {
    // 请求最新一页，pageSize=50 覆盖大多数会话
    const result = await chatHistory(sessionId, { page: 1, pageSize: 50 })
    messages.value = result.list
    currentSessionId.value = sessionId
  }

  async function sendMessage(sessionId: string, content: string) {
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
      await chatSend(sessionId, content)
      // 通过索引替换，确保 Vue 3 响应式追踪
      _updateMessage(msgId, { status: 'sent' })
    } catch (e) {
      _updateMessage(msgId, { status: 'error' })
      logger.error(TAG, 'sendMessage failed', e)
      throw e
    } finally {
      sending.value = false
    }
  }

  async function abortMessage(sessionId: string) {
    await chatAbort(sessionId)
    streaming.value = false
  }

  function clearMessages() {
    messages.value = []
    currentSessionId.value = null
  }

  /**
   * 订阅流式消息推送，返回取消订阅函数
   * 服务端推送事件：chat.stream { sessionId, messageId, content, done }
   */
  function subscribeStream(sessionId: string): () => void {
    const onChunk = (data: unknown) => {
      const d = data as { sessionId?: string; messageId?: string; content?: string; done?: boolean }
      if (d.sessionId !== sessionId) return

      if (d.done) {
        streaming.value = false
        _updateMessage(d.messageId!, { isStreaming: false, status: 'sent' })
        return
      }

      streaming.value = true
      const idx = messages.value.findIndex(m => m.id === d.messageId)
      if (idx === -1) {
        // 新的流式消息，追加到列表
        messages.value.push({
          id: d.messageId!,
          role: 'assistant',
          content: d.content ?? '',
          timestamp: Date.now(),
          isStreaming: true,
        })
      } else {
        // 通过索引替换，确保 Vue 3 响应式追踪
        messages.value[idx] = {
          ...messages.value[idx],
          content: messages.value[idx].content + (d.content ?? ''),
        }
      }
    }

    subscribe('chat.stream', onChunk)
    return () => unsubscribe('chat.stream', onChunk)
  }

  // 通过索引替换消息对象，保证 Vue 3 响应式更新
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
    currentSessionId,
    loadHistory,
    sendMessage,
    abortMessage,
    clearMessages,
    subscribeStream,
  }
})
