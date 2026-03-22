import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '@/utils/storage'
import { logger } from '@/utils/logger'
import { eventBus, Events } from '@/utils/event-bus'
import { connectGateway, disconnectGateway } from '@/api/websocket'
import type { AuthConfig } from '@/types/websocket'

const TAG = 'userStore'

interface User {
  id?: string
  username?: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(storage.get<string>('auth_token'))
  const instanceUrl = ref<string | null>(storage.get<string>('instance_url'))
  const user = ref<User | null>(storage.get<User>('user'))
  const isAuthenticated = computed(() => !!token.value)

  async function loginWithToken(url: string, t: string): Promise<void> {
    await _connect(url, { type: 'token', token: t })
    token.value = t
    instanceUrl.value = url
    storage.set('auth_token', t)
    storage.set('instance_url', url)
    logger.info(TAG, 'logged in with token')
    eventBus.emit(Events.AUTH_LOGIN)
  }

  async function autoLogin(): Promise<boolean> {
    const saved = storage.get<string>('auth_token')
    const url = storage.get<string>('instance_url')
    if (!saved || !url) {
      uni.reLaunch({ url: '/pages/auth/login' })
      return false
    }
    try {
      await loginWithToken(url, saved)
      return true
    } catch (e) {
      logger.warn(TAG, 'auto login failed', e)
      return false
    }
  }

  function logout(): void {
    disconnectGateway()
    _clearAuth()
    logger.info(TAG, 'logged out')
    eventBus.emit(Events.AUTH_LOGOUT)
  }

  function _clearAuth(): void {
    token.value = null
    instanceUrl.value = null
    user.value = null
    storage.remove('auth_token')
    storage.remove('instance_url')
    storage.remove('user')
  }

  async function _connect(url: string, auth: AuthConfig): Promise<void> {
    await connectGateway(url, auth)
    eventBus.emit(Events.WS_CONNECTED)
  }

  return {
    token,
    instanceUrl,
    user,
    isAuthenticated,
    loginWithToken,
    autoLogin,
    logout,
  }
})
