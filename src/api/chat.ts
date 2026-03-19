// 聊天 API

import { rpc } from './websocket'
import type { Message } from '@/types/chat'

export interface ChatHistoryResult {
  messages: Message[]
}

// sessionKey 格式：agent:<agentId>:<sessionId> 或 global
export function chatHistory(sessionKey: string, limit = 50): Promise<ChatHistoryResult> {
  return rpc('chat.history', { sessionKey, limit })
}

export function chatSend(sessionKey: string, message: string, idempotencyKey?: string): Promise<void> {
  return rpc('chat.send', {
    sessionKey,
    message,
    idempotencyKey: idempotencyKey ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })
}

export function chatAbort(sessionKey: string): Promise<void> {
  return rpc('chat.abort', { sessionKey })
}
