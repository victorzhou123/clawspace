// WebSocket 相关类型

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

export interface RpcRequest {
  type: 'req'
  id: string
  method: string
  params?: unknown
}

export interface RpcResponse {
  type: 'res'
  id: string
  ok: boolean
  payload?: unknown
  error?: {
    code: number
    message: string
  }
}

export interface WsEvent {
  type: 'event'
  event: string
  payload: unknown
  seq?: number
  stateVersion?: number
}

export interface AuthConfig {
  type: 'token' | 'password' | 'device_token'
  token?: string
  username?: string
  /** @sensitive 不可持久化到 storage，不可打印日志 */
  password?: string
  deviceToken?: string
}
