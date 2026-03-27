// WebSocket 管理器（连接、重连、心跳）

import { logger } from '@/utils/logger'
import { eventBus, Events } from '@/utils/event-bus'
import type { AuthConfig, RpcRequest, ConnectionStatus } from '@/types/websocket'

const TAG = 'WebSocket'
const REQUEST_TIMEOUT = 30000
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_BASE_DELAY = 1000
// 后端每 30s 发一次 tick，超过 70s 没收到则认为连接已断
const TICK_TIMEOUT = 70000

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
  private pending = new Map<string, PendingRequest>()
  private handlers = new Map<string, Set<EventHandler>>()
  private reconnectAttempts = 0
  private reconnecting = false
  private destroyed = false
  private authFailed = false  // 认证失败，禁止重连
  private _status: ConnectionStatus = 'disconnected'
  private tickTimer: ReturnType<typeof setTimeout> | null = null
  private connectPromise: Promise<void> | null = null

  get status(): ConnectionStatus {
    return this._status
  }

  async connect(url: string, auth: AuthConfig): Promise<void> {
    if (this.connectPromise) return this.connectPromise
    if (this._status === 'connected') return Promise.resolve()

    this.url = url
    this.auth = auth
    this.destroyed = false
    this.authFailed = false
    this._status = 'connecting'

    this.connectPromise = this._connect().finally(() => {
      this.connectPromise = null
    })

    return this.connectPromise
  }

  private _resetTickTimer(): void {
    if (this.tickTimer) clearTimeout(this.tickTimer)
    this.tickTimer = setTimeout(() => {
      if (this._status === 'connected' && !this.destroyed) {
        logger.warn(TAG, `no tick received in ${TICK_TIMEOUT}ms, assuming connection is dead`)
        this.ws?.close({})
        this.ws = null
      }
    }, TICK_TIMEOUT)
  }

  private _clearTickTimer(): void {
    if (this.tickTimer) {
      clearTimeout(this.tickTimer)
      this.tickTimer = null
    }
  }

  private _connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(TAG, `connecting to ${this.url}`)

      const connectTimeout = setTimeout(() => {
        if (this._status !== 'connected') {
          this.ws?.close({})
          reject(new Error('连接超时，请检查实例地址'))
        }
      }, 5000)

      this.ws = uni.connectSocket({
        url: this.url,
        complete: () => {},
      })

      this.ws.onOpen(() => {
        clearTimeout(connectTimeout)
        logger.info(TAG, 'socket opened, sending handshake...')
        this.reconnectAttempts = 0
        this.reconnecting = false

        // 发送握手并等待响应
        this._sendHandshake()
          .then(() => {
            logger.info(TAG, 'handshake successful')
            this._status = 'connected'
            eventBus.emit(Events.WS_CONNECTED)
            // 握手成功后启动 tick 超时检测
            this._resetTickTimer()
            // 握手成功后清除敏感字段
            if (this.auth) {
              delete (this.auth as Record<string, unknown>).password
            }
            resolve()
          })
          .catch((err) => {
            logger.error(TAG, 'handshake failed', err)
            this._status = 'error'
            // 认证类错误不重连，避免触发后端限流
            const msg = (err as Error).message ?? ''
            if (msg.includes('unauthorized') || msg.includes('invalid') || msg.includes('origin') || msg.includes('token')) {
              this.authFailed = true
            }
            this.ws?.close({})
            this.ws = null
            if (this.auth) {
              delete (this.auth as Record<string, unknown>).password
            }
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
        this._clearTickTimer()
        this._status = 'disconnected'
        eventBus.emit(Events.WS_DISCONNECTED)
        if (!this.destroyed && !this.reconnecting && !this.authFailed) this._scheduleReconnect()
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
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: 'openclaw-control-ui',
        version: '1.0.0',
        platform: 'uniapp',
        mode: 'ui'
      },
      role: 'operator',
      scopes: ['operator.read', 'operator.write', 'operator.admin'],
      auth: authPayload
    }

    logger.debug(TAG, 'sending handshake')

    // 握手使用内部 _call，绕过 connected 状态检查
    return this._call('connect', connectParams).then(() => {}) as Promise<void>
  }

  // 内部 call，不检查连接状态（用于握手）
  private _call(method: string, params?: unknown): Promise<unknown> {
    const id = String(++this.requestId)
    const req: RpcRequest = { type: 'req', id, method, params }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`RPC timeout: ${method}`))
      }, REQUEST_TIMEOUT)

      this.pending.set(id, { resolve, reject, timer })
      this._send(req)
    })
  }

  call(method: string, params?: unknown): Promise<unknown> {
    if (this._status !== 'connected') {
      return Promise.reject(new Error(`WebSocket not connected (status: ${this._status})`))
    }
    const id = String(++this.requestId)
    const req: RpcRequest = { type: 'req', id, method, params }

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
    this._clearTickTimer()
    this._status = 'disconnected'
    eventBus.emit(Events.WS_DISCONNECTED)
    this.ws?.close({})
    this.ws = null
    this._rejectAllPending(new Error('WebSocket disconnected'))
  }

  private _send(data: unknown): void {
    try {
      console.log('[WS ↑]', data)
      this.ws?.send({ data: JSON.stringify(data) })
    } catch (e) {
      logger.error(TAG, 'send failed', e)
    }
  }

  private _handleMessage(data: Record<string, unknown>): void {
    console.log('[WS ↓]', data)

    // RPC 响应：{type:"res", id, ok, payload|error}
    if (data['type'] === 'res' && data['id'] !== undefined) {
      const id = String(data['id'])
      if (this.pending.has(id)) {
        const req = this.pending.get(id)!
        clearTimeout(req.timer)
        this.pending.delete(id)
        if (!data['ok']) {
          const err = data['error'] as { message?: string } | undefined
          req.reject(new Error(err?.message ?? 'RPC error'))
        } else {
          req.resolve(data['payload'])
        }
      }
      return
    }

    // 服务器推送事件：{type:"event", event, payload}
    if (data['type'] === 'event' && data['event']) {
      const event = data['event'] as string
      const payload = data['payload']

      // 收到 tick 则重置心跳超时计时器
      if (event === 'tick') {
        this._resetTickTimer()
      }

      const handlers = this.handlers.get(event)
      if (handlers) handlers.forEach(h => h(payload))
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
