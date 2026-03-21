import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatSession } from '@/types/chat'
import { sessionsList, sessionsDelete, sessionsPatch, sessionsReset } from '@/api/sessions'
import { logger } from '@/utils/logger'
import { wsManager } from '@/utils/websocket-manager'

const TAG = 'sessionStore'

function waitForConnected(timeoutMs = 10000): Promise<boolean> {
  if (wsManager.status === 'connected') return Promise.resolve(true)
  if (wsManager.status === 'disconnected' || wsManager.status === 'error') return Promise.resolve(false)
  return new Promise((resolve) => {
    const start = Date.now()
    const check = () => {
      if (wsManager.status === 'connected') return resolve(true)
      if (wsManager.status === 'disconnected' || wsManager.status === 'error') return resolve(false)
      if (Date.now() - start >= timeoutMs) return resolve(false)
      setTimeout(check, 200)
    }
    check()
  })
}

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<ChatSession[]>([])
  const loading = ref(false)
  // 当前选中的 sessionKey
  const currentSessionId = ref<string | null>(null)

  async function fetchSessions() {
    const connected = await waitForConnected()
    if (!connected) {
      logger.warn(TAG, 'fetchSessions skipped: WebSocket not connected')
      return
    }
    loading.value = true
    try {
      const result = await sessionsList({ limit: 50, includeDerivedTitles: true, includeLastMessage: true })
      sessions.value = result.sessions ?? []
    } catch (e) {
      logger.error(TAG, 'fetchSessions failed', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteSession(key: string) {
    await sessionsDelete(key)
    sessions.value = sessions.value.filter(s => s.key !== key)
    if (currentSessionId.value === key) currentSessionId.value = null
  }

  async function renameSession(key: string, label: string) {
    await sessionsPatch(key, { label })
    const idx = sessions.value.findIndex(s => s.key === key)
    if (idx !== -1) sessions.value[idx] = { ...sessions.value[idx], label }
  }

  async function resetSession(key: string) {
    await sessionsReset(key)
    const idx = sessions.value.findIndex(s => s.key === key)
    if (idx !== -1) {
      sessions.value[idx] = { ...sessions.value[idx], lastMessagePreview: '' }
    }
  }

  function setCurrentSession(key: string | null) {
    currentSessionId.value = key
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
