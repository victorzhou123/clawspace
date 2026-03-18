import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '@/utils/storage'
import { logger } from '@/utils/logger'
import { eventBus, Events } from '@/utils/event-bus'
import { connectGateway, disconnectGateway, subscribe } from '@/api/websocket'
import type { AuthConfig } from '@/types/websocket'

const TAG = 'userStore'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(storage.get<string>('auth_token'))
  const isAuthenticated = computed(() => !!token.value)

  async function loginWithToken(t: string): Promise<void> {
    await _connect({ type: 'token', token: t })
    token.value = t
    storage.set('auth_token', t)
    logger.info(TAG, 'logged in with token')
    eventBus.emit(Events.AUTH_LOGIN)
  }

  async function loginWithPassword(username: string, password: string): Promise<void> {
    await _connect({ type: 'password', username, password })
    // 服务端通过 WS 事件 connect.challenge 下发 token，监听后持久化
    subscribe('connect.challenge', (data) => {
      const t = (data as { token?: string })?.token
      if (t) {
        token.value = t
        storage.set('auth_token', t)
        logger.info(TAG, 'token received from server')
      }
    })
    logger.info(TAG, 'logged in with password')
    eventBus.emit(Events.AUTH_LOGIN)
  }

  async function loginWithDeviceToken(deviceToken: string): Promise<void> {
    await _connect({ type: 'device_token', deviceToken })
    storage.set('auth_token', deviceToken)
    token.value = deviceToken
    logger.info(TAG, 'logged in with device token')
    eventBus.emit(Events.AUTH_LOGIN)
  }

  async function autoLogin(): Promise<boolean> {
    const saved = storage.get<string>('auth_token')
    if (!saved) return false
    try {
      await loginWithToken(saved)
      return true
    } catch (e) {
      logger.warn(TAG, 'auto login failed', e)
      _clearAuth()
      return false
    }
  }

  function logout(): void {
    disconnectGateway()
    _clearAuth()
    logger.info(TAG, 'logged out')
    eventBus.emit(Events.AUTH_LOGOUT)
  }

  // 仅清理本地状态，不触发事件（用于静默场景如 autoLogin 失败）
  function _clearAuth(): void {
    token.value = null
    storage.remove('auth_token')
  }

  async function _connect(auth: AuthConfig): Promise<void> {
    await connectGateway(auth)
    eventBus.emit(Events.WS_CONNECTED)
  }

  return {
    token,
    isAuthenticated,
    loginWithToken,
    loginWithPassword,
    loginWithDeviceToken,
    autoLogin,
    logout,
  }
})
