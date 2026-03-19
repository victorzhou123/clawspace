// 聊天相关类型

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export type MessageStatus = 'sending' | 'sent' | 'error'

export interface Message {
  id: string
  role: MessageRole
  /** 当前仅支持纯文本，后续如需多模态（图片/文件）需扩展为 string | ContentPart[] */
  content: string
  timestamp: number
  isStreaming?: boolean
  status?: MessageStatus
  toolCalls?: ToolCall[]
}

export interface ToolCall {
  id: string
  name: string
  input: unknown
  output?: unknown
  status: 'pending' | 'running' | 'done' | 'error'
}

export interface ChatSession {
  // sessionKey，格式：agent:<agentId>:<sessionId> 或 global
  key: string
  kind: 'direct' | 'group' | 'global' | 'unknown'
  label?: string
  displayName?: string
  derivedTitle?: string
  lastMessagePreview?: string
  updatedAt: number | null
  sessionId?: string
}
