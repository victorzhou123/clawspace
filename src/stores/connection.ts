// connectionStore - WebSocket 连接状态

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { eventBus, Events } from '@/utils/event-bus'
import { wsManager } from '@/utils/websocket-manager'
import type { ConnectionStatus } from '@/types/websocket'

export const useConnectionStore = defineStore('connection', () => {
  const status = ref<ConnectionStatus>('disconnected')

  // Pinia setup store 在同一 app 实例中只初始化一次，监听器不会重复注册
  eventBus.on(Events.WS_CONNECTED, () => { status.value = 'connected' })
  eventBus.on(Events.WS_DISCONNECTED, () => { status.value = 'disconnected' })

  function syncStatus(): void {
    status.value = wsManager.status
  }

  return { status, syncStatus }
})
