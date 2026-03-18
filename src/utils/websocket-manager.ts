// WebSocket 管理器（连接、重连、心跳）

import { logger } from '@/utils/logger'
import type { AuthConfig, RpcRequest, RpcResponse, WsEvent, ConnectionStatus } from '@/types/websocket'

const TAG = 'WebSocket'
const REQUEST_TIMEOUT = 30000
const HEARTBEAT_INTERVAL = 30000
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_BASE_DELAY = 1000

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timer: ReturnType<typeof setTimeout>
}

type EventHandler = (data: unknown) => void

export class WebSocketManager {
  private ws: UniApp.SocketTask | null = null
  private url = ''
  private auth: AuthConfig | null = null
  private requestId = 0
  private pending = new Map<number, PendingRequest>()
  private handlers = new Map<string, Set<EventHandler>>()
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectAttempts = 0
  private reconnecting = false
  private destroyed = false

  get status(): ConnectionStatus {
    if (!this.ws) return 'disconnected'
    return 'connected'
  }

  async connect(url: string, auth: AuthConfig): Promise<void> {
    this.url = url
    this.auth = auth
    this.destroyed = false
    return this._connect()
  }

  private _connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(TAG, `connecting to ${this.url}`)

      this.ws = uni.connectSocket({
        url: this.url,
        complete: () => {},
      })

      this.ws.onOpen(() => {
        logger.info(TAG, 'connected')
        this.reconnectAttempts = 0
        this.reconnecting = false
        this._startHeartbeat()
        this._sendAuth()
        resolve()
      })

      this.ws.onMessage((res) => {
        try {
          const data = JSON.parse(res.data as string)
          this._handleMessage(data)
        } catch (e) {
          logger.warn(TAG, 'failed to parse message', e)
        }
      })

      this.ws.onClose(() => {
        logger.warn(TAG, 'connection closed')
        this._stopHeartbeat()
        if (!this.destroyed) this._scheduleReconnect()
      })

      this.ws.onError((err) => {
        logger.error(TAG, 'connection error', err)
        if (!this.destroyed) {
          reject(new Error('WebSocket connection failed'))
          this._scheduleReconnect()
        }
      })
    })
  }

  private _sendAuth(): void {
    if (!this.auth) return
    const msg: Record<string, unknown> = { type: 'auth', authType: this.auth.type }
    if (this.auth.type === 'token') msg.token = this.auth.token
    if (this.auth.type === 'password') {
      msg.username = this.auth.username
      msg.password = this.auth.password
    }
    if (this.auth.type === 'device_token') msg.deviceToken = this.auth.deviceToken
    this._send(msg)
  }

  call(method: string, params?: unknown): Promise<unknown> {
    const id = ++this.requestId
    const req: RpcRequest = { id, method, params }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`RPC timeout: ${method}`))
      }, REQUEST_TIMEOUT)

      this.pending.set(id, { resolve, reject, timer })
      this._send(req)
    })
  }

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler)
  }

  disconnect(): void {
    this.destroyed = true
    this._stopHeartbeat()
    this.ws?.close({})
    this.ws = null
    this._rejectAllPending(new Error('WebSocket disconnected'))
  }

  private _send(data: unknown): void {
    try {
      this.ws?.send({ data: JSON.stringify(data) })
    } catch (e) {
      logger.error(TAG, 'send failed', e)
    }
  }

  private _handleMessage(data: RpcResponse & WsEvent): void {
    // RPC 响应
    if (data.id !== undefined && this.pending.has(data.id)) {
      const req = this.pending.get(data.id)!
      clearTimeout(req.timer)
      this.pending.delete(data.id)
      if (data.error) {
        req.reject(new Error(data.error.message))
      } else {
        req.resolve(data.result)
      }
      return
    }

    // 服务器推送事件
    if (data.event) {
      const handlers = this.handlers.get(data.event)
      if (handlers) handlers.forEach(h => h(data.data))
    }
  }

  private _startHeartbeat(): void {
    this._stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this._send({ type: 'ping' })
    }, HEARTBEAT_INTERVAL)
  }

  private _stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private _scheduleReconnect(): void {
    if (this.reconnecting || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger.error(TAG, 'max reconnect attempts reached')
      return
    }
    this.reconnecting = true
    this.reconnectAttempts++
    const delay = RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts - 1)
    logger.info(TAG, `reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
    setTimeout(() => {
      this._connect().catch(() => {
        this.reconnecting = false
      })
    }, delay)
  }

  private _rejectAllPending(err: Error): void {
    this.pending.forEach(({ reject, timer }) => {
      clearTimeout(timer)
      reject(err)
    })
    this.pending.clear()
  }
}

export const wsManager = new WebSocketManager()
