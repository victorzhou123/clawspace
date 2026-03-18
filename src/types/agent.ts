// Agent 相关类型

export interface Agent {
  id: string
  name: string
  description?: string
  model?: string
  systemPrompt?: string
  tools?: string[]
  createdAt: number
  updatedAt: number
}

export interface AgentIdentity {
  id: string
  name: string
  version: string
}
