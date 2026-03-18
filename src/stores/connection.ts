// connectionStore - WebSocket 连接状态

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { eventBus, Events } from '@/utils/event-bus'
import { wsManager } from '@/utils/websocket-manager'
import type { ConnectionStatus } from '@/types/websocket'

export const useConnectionStore = defineStore('connection', () => {
  const status = ref<ConnectionStatus>('disconnected')
  const reconnectAttempts = ref(0)

  // 监听事件总线同步状态
  eventBus.on(Events.WS_CONNECTED, () => { status.value = 'connected' })
  eventBus.on(Events.WS_DISCONNECTED, () => { status.value = 'disconnected' })

  function syncStatus(): void {
    status.value = wsManager.status
  }

  return { status, reconnectAttempts, syncStatus }
})
