import { WebSocketServer, WebSocket } from 'ws'

export interface MockWsServer {
  port: number
  url: string
  close: () => Promise<void>
  setReply: (text: string) => void
  received: Array<{ method: string; params: unknown }>
}

export function createMockWsServer(): Promise<MockWsServer> {
  return new Promise((resolve) => {
    const wss = new WebSocketServer({ port: 0 })
    let replyText = 'mock reply'
    const received: Array<{ method: string; params: unknown }> = []
    const clients = new Set<WebSocket>()

    wss.on('connection', (ws: WebSocket) => {
      clients.add(ws)
      ws.on('close', () => clients.delete(ws))

      ws.on('message', (raw: Buffer) => {
        let msg: Record<string, unknown>
        try { msg = JSON.parse(raw.toString()) } catch { return }

        const type = msg['type']
        const id = msg['id'] as string
        const method = msg['method'] as string
        const params = msg['params']

        if (type !== 'req') return
        received.push({ method, params })

        if (method === 'connect') {
          ws.send(JSON.stringify({ type: 'res', id, ok: true, payload: { protocol: 3 } }))
          return
        }

        if (method === 'chat.history') {
          ws.send(JSON.stringify({ type: 'res', id, ok: true, payload: { messages: [] } }))
          return
        }

        if (method === 'chat.send') {
          const p = params as Record<string, unknown>
          const sessionKey = p?.sessionKey as string
          const runId = `run-${Date.now()}`

          ws.send(JSON.stringify({ type: 'res', id, ok: true, payload: {} }))

          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'event', event: 'chat',
              payload: { runId, sessionKey, seq: 1, state: 'delta', message: { text: replyText } },
            }))
          }, 50)

          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'event', event: 'chat',
              payload: { runId, sessionKey, seq: 2, state: 'final', message: { text: replyText } },
            }))
          }, 100)
          return
        }

        ws.send(JSON.stringify({ type: 'res', id, ok: true, payload: {} }))
      })
    })

    wss.on('listening', () => {
      const addr = wss.address() as { port: number }
      resolve({
        port: addr.port,
        url: `ws://127.0.0.1:${addr.port}`,
        close: () => {
          // 强制关闭所有客户端，再关闭 server
          clients.forEach(c => c.terminate())
          clients.clear()
          return new Promise((res) => wss.close(() => res()))
        },
        setReply: (text: string) => { replyText = text },
        received,
      })
    })
  })
}

