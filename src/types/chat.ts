// 聊天相关类型

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool' | 'toolResult'

export type MessageStatus = 'sending' | 'sent' | 'error'

export type ContentPart = TextContent | ThinkingContent | ToolCallContent

export interface TextContent {
  type: 'text'
  text: string
}

export interface ThinkingContent {
  type: 'thinking'
  thinking: string
}

export interface ToolCallContent {
  type: 'toolCall'
  id: string
  name: string
  arguments: unknown
}

export interface Message {
  id: string
  role: MessageRole
  content: string | ContentPart[]
  timestamp: number
  isStreaming?: boolean
  isLoading?: boolean
  status?: MessageStatus
  toolCalls?: ToolCall[]
  toolCallId?: string
  toolName?: string
  isError?: boolean
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
