// 事件总线（跨组件通信）

type Handler = (payload?: unknown) => void

class EventBus {
  private events = new Map<string, Set<Handler>>()

  on(event: string, handler: Handler): void {
    if (!this.events.has(event)) this.events.set(event, new Set())
    this.events.get(event)!.add(handler)
  }

  off(event: string, handler: Handler): void {
    this.events.get(event)?.delete(handler)
  }

  once(event: string, handler: Handler): void {
    const wrapper: Handler = (payload) => {
      handler(payload)
      this.off(event, wrapper)
    }
    this.on(event, wrapper)
  }

  emit(event: string, payload?: unknown): void {
    this.events.get(event)?.forEach(h => h(payload))
  }

  clear(event?: string): void {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
  }
}

export const eventBus = new EventBus()

// 全局事件名常量
export const Events = {
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  WS_CONNECTED: 'ws:connected',
  WS_DISCONNECTED: 'ws:disconnected',
  SESSION_CHANGED: 'session:changed',
} as const
