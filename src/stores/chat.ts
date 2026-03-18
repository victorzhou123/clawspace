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
    const result = await chatHistory(sessionId)
    messages.value = result.list
    currentSessionId.value = sessionId
  }

  async function sendMessage(sessionId: string, content: string) {
    const userMsg: Message = {
      id: `local-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
      status: 'sending',
    }
    messages.value.push(userMsg)
    sending.value = true
    try {
      await chatSend(sessionId, content)
      userMsg.status = 'sent'
    } catch (e) {
      userMsg.status = 'error'
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
        const msg = messages.value.find(m => m.id === d.messageId)
        if (msg) { msg.isStreaming = false; msg.status = 'sent' }
        return
      }

      streaming.value = true
      let msg = messages.value.find(m => m.id === d.messageId)
      if (!msg) {
        msg = {
          id: d.messageId!,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isStreaming: true,
        }
        messages.value.push(msg)
      }
      msg.content += d.content ?? ''
    }

    subscribe('chat.stream', onChunk)
    return () => unsubscribe('chat.stream', onChunk)
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
