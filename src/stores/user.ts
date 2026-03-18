// userStore - 用户信息与认证状态

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '@/utils/storage'
import { logger } from '@/utils/logger'
import { eventBus, Events } from '@/utils/event-bus'
import { connectGateway, disconnectGateway } from '@/api/websocket'
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
    // password 认证后服务端会通过 WS 事件下发 token，此处仅建立连接
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
      logout()
      return false
    }
  }

  function logout(): void {
    disconnectGateway()
    token.value = null
    storage.remove('auth_token')
    logger.info(TAG, 'logged out')
    eventBus.emit(Events.AUTH_LOGOUT)
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
