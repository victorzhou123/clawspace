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

export interface AgentFileEntry {
  name: string
  path: string
  missing: boolean
  size?: number
  updatedAtMs?: number
  content?: string
}

export interface AgentsFilesListResult {
  agentId: string
  workspace: string
  files: AgentFileEntry[]
}

export interface AgentsFilesGetResult {
  agentId: string
  workspace: string
  file: AgentFileEntry
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

export function agentsFilesList(agentId: string): Promise<AgentsFilesListResult> {
  return rpc('agents.files.list', { agentId })
}

export function agentsFilesGet(agentId: string, name: string): Promise<AgentsFilesGetResult> {
  return rpc('agents.files.get', { agentId, name })
}

export function agentsFilesSet(agentId: string, name: string, content: string): Promise<unknown> {
  return rpc('agents.files.set', { agentId, name, content })
}
