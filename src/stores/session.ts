import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatSession } from '@/types/chat'
import { sessionsList, sessionsDelete, sessionsPatch, sessionsReset } from '@/api/sessions'
import { logger } from '@/utils/logger'

const TAG = 'sessionStore'

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<ChatSession[]>([])
  const loading = ref(false)
  const currentSessionId = ref<string | null>(null)

  async function fetchSessions(page = 1, pageSize = 20) {
    loading.value = true
    try {
      const result = await sessionsList({ page, pageSize })
      sessions.value = result.list
    } catch (e) {
      logger.error(TAG, 'fetchSessions failed', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteSession(sessionId: string) {
    await sessionsDelete(sessionId)
    sessions.value = sessions.value.filter(s => s.id !== sessionId)
    if (currentSessionId.value === sessionId) currentSessionId.value = null
  }

  async function renameSession(sessionId: string, title: string) {
    const updated = await sessionsPatch(sessionId, { title })
    const idx = sessions.value.findIndex(s => s.id === sessionId)
    if (idx !== -1) sessions.value[idx] = updated
  }

  async function resetSession(sessionId: string) {
    await sessionsReset(sessionId)
    // 重置后清空本地会话条目的消息计数和预览
    const idx = sessions.value.findIndex(s => s.id === sessionId)
    if (idx !== -1) {
      sessions.value[idx] = { ...sessions.value[idx], messageCount: 0, preview: '' }
    }
  }

  function setCurrentSession(sessionId: string | null) {
    currentSessionId.value = sessionId
  }

  return {
    sessions,
    loading,
    currentSessionId,
    fetchSessions,
    deleteSession,
    renameSession,
    resetSession,
    setCurrentSession,
  }
})
