// 会话管理 API

import { rpc } from './websocket'
import type { ChatSession } from '@/types/chat'
import type { PaginationParams, PaginationResult } from '@/types/common'

export function sessionsList(params?: Partial<PaginationParams>): Promise<PaginationResult<ChatSession>> {
  return rpc('sessions.list', params)
}

export function sessionsPreview(sessionId: string): Promise<ChatSession> {
  return rpc('sessions.preview', { sessionId })
}

export function sessionsPatch(sessionId: string, data: Partial<Pick<ChatSession, 'title'>>): Promise<ChatSession> {
  return rpc('sessions.patch', { sessionId, ...data })
}

export function sessionsDelete(sessionId: string): Promise<void> {
  return rpc('sessions.delete', { sessionId })
}

export function sessionsReset(sessionId: string): Promise<void> {
  return rpc('sessions.reset', { sessionId })
}
