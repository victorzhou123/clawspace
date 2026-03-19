// WebSocket API 层 - RPC 调用封装

import { wsManager } from '@/utils/websocket-manager'
import { logger } from '@/utils/logger'
import type { AuthConfig } from '@/types/websocket'

const TAG = 'WsAPI'

export async function connectGateway(url: string, auth: AuthConfig): Promise<void> {
  if (!url) {
    const err = 'instance URL is not set'
    logger.error(TAG, err)
    throw new Error(err)
  }
  const wsUrl = url.replace(/^http/, 'ws')
  await wsManager.connect(wsUrl, auth)
}

export function disconnectGateway(): void {
  wsManager.disconnect()
}

// 通用 RPC 调用
export function rpc<T = unknown>(method: string, params?: unknown): Promise<T> {
  return wsManager.call(method, params) as Promise<T>
}

// 订阅服务器推送事件
export function subscribe(event: string, handler: (data: unknown) => void): void {
  wsManager.on(event, handler)
}

export function unsubscribe(event: string, handler: (data: unknown) => void): void {
  wsManager.off(event, handler)
}
