// 会话管理 API
// 后端使用 sessionKey（格式：agent:<agentId>:<sessionId> 或 global）作为会话标识

import { rpc } from './websocket'
import type { ChatSession } from '@/types/chat'

export interface SessionsListParams {
  limit?: number
  includeDerivedTitles?: boolean
  includeLastMessage?: boolean
  agentId?: string
}

export interface SessionsListResult {
  sessions: ChatSession[]
}

export function sessionsList(params?: SessionsListParams): Promise<SessionsListResult> {
  return rpc('sessions.list', params ?? {})
}

// keys 是 sessionKey 数组
export function sessionsPreview(keys: string[]): Promise<unknown> {
  return rpc('sessions.preview', { keys })
}

export function sessionsPatch(key: string, data: { label?: string | null }): Promise<unknown> {
  return rpc('sessions.patch', { key, ...data })
}

export function sessionsDelete(key: string): Promise<void> {
  return rpc('sessions.delete', { key })
}

export interface SessionsCreateParams {
  agentId?: string
  label?: string
}

export interface SessionsCreateResult {
  key: string
  sessionId: string
}

export function sessionsCreate(params?: SessionsCreateParams): Promise<SessionsCreateResult> {
  return rpc('sessions.create', params ?? {})
}

export function sessionsReset(key: string): Promise<void> {
  return rpc('sessions.reset', { key })
}
