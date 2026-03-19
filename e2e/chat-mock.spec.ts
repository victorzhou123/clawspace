/**
 * chat-mock.spec.ts
 *
 * 使用 mock WebSocket 服务端验证聊天流程。
 * 不依赖真实后端，能精确捕捉事件名错误、消息格式错误等前端 bug。
 */
import { test, expect } from '@playwright/test'
import { createMockWsServer } from './mock-ws-server'
import type { MockWsServer } from './mock-ws-server'

const TOKEN = 'mock-token-for-testing-1234'

async function loginWithMock(page: import('@playwright/test').Page, url: string) {
  await page.goto('/')
  await page.getByRole('textbox').first().fill(url)
  await page.getByRole('textbox').nth(1).fill(TOKEN)
  await page.locator('text=连接').click()
  await expect(page.locator('.uni-tabbar')).toBeVisible({ timeout: 10000 })
}

function getPinia(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const appEl = document.getElementById('app') as Record<string, unknown> | null
    const app = appEl?.['__vue_app__'] as Record<string, unknown> | undefined
    const ctx = app?._context as Record<string, unknown> | undefined
    const provides = ctx?.provides as Record<symbol, unknown> | undefined
    if (!provides) return null
    const pinia = Object.getOwnPropertySymbols(provides)
      .map(s => provides[s])
      .find(v => v && typeof v === 'object' && '_s' in (v as object)) as Record<string, unknown> | undefined
    return pinia ? true : false
  })
}

function getChatStore(page: import('@playwright/test').Page) {
  return (fn: string, ...args: unknown[]) =>
    page.evaluate(
      ([fnName, fnArgs]) => {
        const appEl = document.getElementById('app') as Record<string, unknown> | null
        const app = appEl?.['__vue_app__'] as Record<string, unknown> | undefined
        const ctx = app?._context as Record<string, unknown> | undefined
        const provides = ctx?.provides as Record<symbol, unknown> | undefined
        if (!provides) return null
        const pinia = Object.getOwnPropertySymbols(provides)
          .map(s => provides[s])
          .find(v => v && typeof v === 'object' && '_s' in (v as object)) as Record<string, unknown> | undefined
        const store = (pinia?._s as Map<string, Record<string, unknown>> | undefined)?.get('chat')
        if (!store) return null
        const method = store[fnName as string] as ((...a: unknown[]) => unknown) | undefined
        return method?.apply(store, fnArgs as unknown[]) ?? null
      },
      [fnName, fnArgs] as [string, unknown[]]
    )
}

test.describe('聊天模块（Mock WS）', () => {
  let server: MockWsServer

  test.beforeEach(async () => {
    server = await createMockWsServer()
    server.received.length = 0
  })

  test.afterEach(async () => {
    await server.close()
  })

  test('M01 - mock 服务器握手成功', async ({ page }) => {
    await loginWithMock(page, server.url)
    await expect(page.locator('.uni-tabbar')).toBeVisible()
    const handshake = server.received.find(r => r.method === 'connect')
    expect(handshake).toBeTruthy()
  })

  test('M02 - 进入会话后前端发出 chat.history', async ({ page }) => {
    server.received.length = 0
    await loginWithMock(page, server.url)

    await page.evaluate(() => {
      const appEl = document.getElementById('app') as Record<string, unknown> | null
      const app = appEl?.['__vue_app__'] as Record<string, unknown> | undefined
      const ctx = app?._context as Record<string, unknown> | undefined
      const provides = ctx?.provides as Record<symbol, unknown> | undefined
      if (!provides) return
      const pinia = Object.getOwnPropertySymbols(provides)
        .map(s => provides[s])
        .find(v => v && typeof v === 'object' && '_s' in (v as object)) as Record<string, unknown> | undefined
      const chatStore = (pinia?._s as Map<string, Record<string, unknown>> | undefined)?.get('chat')
      ;(chatStore?.loadHistory as ((k: string) => Promise<void>) | undefined)?.('mock-session').catch(() => {})
    })

    await page.waitForTimeout(500)
    const historyReq = server.received.find(r => r.method === 'chat.history')
    expect(historyReq).toBeTruthy()
  })

  test('M03 - 发送消息后前端发出 chat.send', async ({ page }) => {
    await loginWithMock(page, server.url)

    await page.evaluate(async () => {
      const appEl = document.getElementById('app') as Record<string, unknown> | null
      const app = appEl?.['__vue_app__'] as Record<string, unknown> | undefined
      const ctx = app?._context as Record<string, unknown> | undefined
      const provides = ctx?.provides as Record<symbol, unknown> | undefined
      if (!provides) return
      const pinia = Object.getOwnPropertySymbols(provides)
        .map(s => provides[s])
        .find(v => v && typeof v === 'object' && '_s' in (v as object)) as Record<string, unknown> | undefined
      const chatStore = (pinia?._s as Map<string, Record<string, unknown>> | undefined)?.get('chat')
      await (chatStore?.sendMessage as ((k: string, m: string) => Promise<void>) | undefined)
        ?.('mock-session', 'hello mock').catch(() => {})
    })

    await page.waitForTimeout(500)
    const sendReq = server.received.find(r => r.method === 'chat.send')
    expect(sendReq).toBeTruthy()
    expect((sendReq!.params as Record<string, unknown>).sessionKey).toBe('mock-session')
    expect((sendReq!.params as Record<string, unknown>).message).toBe('hello mock')
  })

  test('M04 - mock 推送 chat 事件后 store 收到 assistant 消息', async ({ page }) => {
    server.setReply('你好，我是 mock AI')
    await loginWithMock(page, server.url)

    const hasAssistant = await page.evaluate(async () => {
      const appEl = document.getElementById('app') as Record<string, unknown> | null
      const app = appEl?.['__vue_app__'] as Record<string, unknown> | undefined
      const ctx = app?._context as Record<string, unknown> | undefined
      const provides = ctx?.provides as Record<symbol, unknown> | undefined
      if (!provides) return false
      const pinia = Object.getOwnPropertySymbols(provides)
        .map(s => provides[s])
        .find(v => v && typeof v === 'object' && '_s' in (v as object)) as Record<string, unknown> | undefined
      const chatStore = (pinia?._s as Map<string, Record<string, unknown>> | undefined)?.get('chat')
      if (!chatStore) return false

      ;(chatStore.subscribeStream as ((k: string) => () => void) | undefined)?.('mock-session')
      await (chatStore.sendMessage as ((k: string, m: string) => Promise<void>) | undefined)
        ?.('mock-session', 'test').catch(() => {})
      await new Promise(r => setTimeout(r, 800))

      return (chatStore.messages as Array<{ role: string; content: string }> | undefined)
        ?.some(m => m.role === 'assistant' && m.content === '你好，我是 mock AI') ?? false
    })

    expect(hasAssistant).toBe(true)
  })

  test('M05 - 错误事件名不触发 assistant 消息（回归 BUG-009）', async ({ page }) => {
    await loginWithMock(page, server.url)

    const added = await page.evaluate(async () => {
      const appEl = document.getElementById('app') as Record<string, unknown> | null
      const app = appEl?.['__vue_app__'] as Record<string, unknown> | undefined
      const ctx = app?._context as Record<string, unknown> | undefined
      const provides = ctx?.provides as Record<symbol, unknown> | undefined
      if (!provides) return -1
      const pinia = Object.getOwnPropertySymbols(provides)
        .map(s => provides[s])
        .find(v => v && typeof v === 'object' && '_s' in (v as object)) as Record<string, unknown> | undefined
      const chatStore = (pinia?._s as Map<string, Record<string, unknown>> | undefined)?.get('chat')
      if (!chatStore) return -1

      ;(chatStore.subscribeStream as ((k: string) => () => void) | undefined)?.('mock-session')
      const before = (chatStore.messages as unknown[] | undefined)?.length ?? 0

      // 模拟收到错误事件名（前端不应处理）
      const wsManager = (window as unknown as Record<string, unknown>).wsManager as {
        _handleMessage?: (d: unknown) => void
      } | undefined
      wsManager?._handleMessage?.({
        type: 'event',
        event: 'WRONG_EVENT_NAME',
        payload: { sessionKey: 'mock-session', state: 'final', message: { text: 'should not appear' } },
      })

      await new Promise(r => setTimeout(r, 200))
      return ((chatStore.messages as unknown[] | undefined)?.length ?? 0) - before
    })

    expect(added).toBe(0)
  })

})
