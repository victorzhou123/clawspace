// WebSocket 相关类型

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

export interface RpcRequest {
  id: number
  method: string
  params?: unknown
}

export interface RpcResponse {
  id: number
  result?: unknown
  error?: {
    code: number
    message: string
  }
}

export interface WsEvent {
  event: string
  data: unknown
}

export interface AuthConfig {
  type: 'token' | 'password' | 'device_token'
  token?: string
  username?: string
  password?: string
  deviceToken?: string
}
