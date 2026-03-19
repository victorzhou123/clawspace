// Agent 管理 API

import { rpc } from './websocket'
import type { Agent } from '@/types/agent'

export interface AgentInput {
  name: string
  description?: string
  model?: string
  systemPrompt?: string
}

export interface AgentsListResult {
  defaultId: string
  mainKey: string
  agents: Agent[]
}

export function agentsList(): Promise<AgentsListResult> {
  return rpc('agents.list', {})
}

export function agentsCreate(data: AgentInput): Promise<unknown> {
  return rpc('agents.create', data)
}

export function agentsUpdate(agentId: string, data: Partial<AgentInput>): Promise<unknown> {
  return rpc('agents.update', { agentId, ...data })
}

export function agentsDelete(agentId: string): Promise<void> {
  return rpc('agents.delete', { agentId })
}

