import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Agent } from '@/types/agent'
import { agentsList, agentsCreate, agentsUpdate, agentsDelete } from '@/api/agents'
import type { AgentInput } from '@/api/agents'
import { logger } from '@/utils/logger'

const TAG = 'agentStore'

export const useAgentStore = defineStore('agent', () => {
  const agents = ref<Agent[]>([])
  const loading = ref(false)
  const currentAgent = ref<Agent | null>(null)

  async function fetchAgents() {
    loading.value = true
    try {
      const result = await agentsList({ page: 1, pageSize: 50 })
      agents.value = result.list
    } catch (e) {
      logger.error(TAG, 'fetchAgents failed', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createAgent(data: AgentInput): Promise<Agent> {
    const agent = await agentsCreate(data)
    agents.value.unshift(agent)
    return agent
  }

  async function updateAgent(agentId: string, data: Partial<AgentInput>): Promise<Agent> {
    const updated = await agentsUpdate(agentId, data)
    const idx = agents.value.findIndex(a => a.id === agentId)
    if (idx !== -1) agents.value[idx] = updated
    if (currentAgent.value?.id === agentId) currentAgent.value = updated
    return updated
  }

  async function deleteAgent(agentId: string) {
    await agentsDelete(agentId)
    agents.value = agents.value.filter(a => a.id !== agentId)
    if (currentAgent.value?.id === agentId) currentAgent.value = null
  }

  function setCurrentAgent(agent: Agent | null) {
    currentAgent.value = agent
  }

  return {
    agents,
    loading,
    currentAgent,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    setCurrentAgent,
  }
})
