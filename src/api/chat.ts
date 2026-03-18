// 聊天 API

import { rpc } from './websocket'
import type { Message } from '@/types/chat'
import type { PaginationParams, PaginationResult } from '@/types/common'

export function chatHistory(sessionId: string, params?: Partial<PaginationParams>): Promise<PaginationResult<Message>> {
  return rpc('chat.history', { sessionId, ...params })
}

export function chatSend(sessionId: string, content: string): Promise<void> {
  return rpc('chat.send', { sessionId, content })
}

export function chatAbort(sessionId: string): Promise<void> {
  return rpc('chat.abort', { sessionId })
}
