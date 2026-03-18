import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '@/utils/storage'
import { logger } from '@/utils/logger'
import { eventBus, Events } from '@/utils/event-bus'
import { connectGateway, disconnectGateway, rpc } from '@/api/websocket'
import type { AuthConfig } from '@/types/websocket'

const TAG = 'userStore'

interface User {
  id?: string
  username?: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(storage.get<string>('auth_token'))
  const user = ref<User | null>(storage.get<User>('user'))
  const isAuthenticated = computed(() => !!token.value)

  async function loginWithToken(t: string): Promise<void> {
    await _connect({ type: 'token', token: t })
    // 通过 RPC 验证 token 有效性
    try {
      await rpc('auth.login', { type: 'token', token: t })
    } catch (e) {
      disconnectGateway()
      _clearAuth()
      throw e
    }
    token.value = t
    storage.set('auth_token', t)
    logger.info(TAG, 'logged in with token')
    eventBus.emit(Events.AUTH_LOGIN)
  }

  async function loginWithPassword(username: string, password: string): Promise<void> {
    await _connect({ type: 'password', username, password })
    // 通过 RPC 验证密码
    try {
      const result = await rpc<{ token?: string }>('auth.login', { type: 'password', username, password })
      if (result.token) {
        token.value = result.token
        storage.set('auth_token', result.token)
      }
    } catch (e) {
      disconnectGateway()
      _clearAuth()
      throw e
    }
    // 保存用户信息
    user.value = { username }
    storage.set('user', user.value)
    logger.info(TAG, 'logged in with password')
    eventBus.emit(Events.AUTH_LOGIN)
  }

  async function loginWithDeviceToken(deviceToken: string): Promise<void> {
    await _connect({ type: 'device_token', deviceToken })
    // 通过 RPC 验证 device token
    try {
      await rpc('auth.login', { type: 'device_token', deviceToken })
    } catch (e) {
      disconnectGateway()
      _clearAuth()
      throw e
    }
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
    user.value = null
    storage.remove('auth_token')
    storage.remove('user')
  }

  async function _connect(auth: AuthConfig): Promise<void> {
    await connectGateway(auth)
    eventBus.emit(Events.WS_CONNECTED)
  }

  return {
    token,
    user,
    isAuthenticated,
    loginWithToken,
    loginWithPassword,
    loginWithDeviceToken,
    autoLogin,
    logout,
  }
})
