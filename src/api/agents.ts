// Agent 管理 API

import { rpc } from './websocket'
import type { Agent, AgentIdentity } from '@/types/agent'
import type { PaginationParams, PaginationResult } from '@/types/common'

export interface AgentInput {
  name: string
  description?: string
  model?: string
  systemPrompt?: string
  tools?: string[]
}

export function agentsList(params?: Partial<PaginationParams>): Promise<PaginationResult<Agent>> {
  return rpc('agents.list', params)
}

export function agentsCreate(data: AgentInput): Promise<Agent> {
  return rpc('agents.create', data)
}

export function agentsUpdate(agentId: string, data: Partial<AgentInput>): Promise<Agent> {
  return rpc('agents.update', { agentId, ...data })
}

export function agentsDelete(agentId: string): Promise<void> {
  return rpc('agents.delete', { agentId })
}

export function agentExecute(agentId: string, params?: Record<string, unknown>): Promise<unknown> {
  return rpc('agent', { agentId, ...params })
}

export function agentIdentityGet(agentId: string): Promise<AgentIdentity> {
  return rpc('agent.identity.get', { agentId })
}
