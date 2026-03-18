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
  private _status: ConnectionStatus = 'disconnected'

  get status(): ConnectionStatus {
    return this._status
  }

  async connect(url: string, auth: AuthConfig): Promise<void> {
    this.url = url
    this.auth = auth
    this.destroyed = false
    this._status = 'connecting'
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
        this._status = 'connected'
        this.reconnectAttempts = 0
        this.reconnecting = false
        this._startHeartbeat()

        // 发送握手并等待响应
        this._sendHandshake()
          .then(() => {
            logger.info(TAG, 'handshake successful')
            resolve()
          })
          .catch((err) => {
            logger.error(TAG, 'handshake failed', err)
            this._status = 'error'
            reject(err)
          })
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
        this._status = 'disconnected'
        this._stopHeartbeat()
        if (!this.destroyed && !this.reconnecting) this._scheduleReconnect()
      })

      this.ws.onError((err) => {
        logger.error(TAG, 'connection error', err)
        this._status = 'error'
        if (!this.destroyed) {
          reject(new Error('WebSocket connection failed'))
          // 由 onClose 统一触发重连，此处不重复调用
        }
      })
    })
  }

  private _sendHandshake(): Promise<void> {
    if (!this.auth) return Promise.reject(new Error('No auth config'))

    const authPayload: Record<string, string> = {}
    if (this.auth.type === 'token' && this.auth.token) {
      authPayload.token = this.auth.token
    } else if (this.auth.type === 'password' && this.auth.password) {
      authPayload.password = this.auth.password
    } else if (this.auth.type === 'device_token' && this.auth.deviceToken) {
      authPayload.deviceToken = this.auth.deviceToken
    }

    const connectParams = {
      minProtocol: 1,
      maxProtocol: 1,
      client: {
        id: 'clawspace-uniapp',
        version: '1.0.0',
        platform: 'uniapp',
        mode: 'client'
      },
      auth: authPayload
    }

    logger.debug(TAG, 'sending handshake')

    // 使用 call() 方法发送握手请求，这样可以等待响应
    return this.call('connect', connectParams).then(() => {
      // 握手成功，不需要返回值
    }) as Promise<void>
  }

  call(method: string, params?: unknown): Promise<unknown> {
    if (this._status !== 'connected') {
      return Promise.reject(new Error(`WebSocket not connected (status: ${this._status})`))
    }
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
    this._status = 'disconnected'
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
    // 调试：记录所有收到的消息
    logger.debug(TAG, 'received message:', data)

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
      logger.debug(TAG, `event received: ${data.event}`, data.data)
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
// 注意：wsManager 是模块级单例，适用于连接单一 Gateway 的场景。
// 若需连接多个 WebSocket 端点，请直接实例化 WebSocketManager。
