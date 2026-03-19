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
  let lastFetchTime = 0

  async function fetchAgents(force = false) {
    if (!force && Date.now() - lastFetchTime < 5 * 60 * 1000) return

    loading.value = true
    try {
      const result = await agentsList()
      agents.value = result.agents ?? []
      lastFetchTime = Date.now()
    } catch (e) {
      logger.error(TAG, 'fetchAgents failed', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createAgent(data: AgentInput): Promise<void> {
    await agentsCreate(data)
    await fetchAgents(true)
  }

  async function updateAgent(agentId: string, data: Partial<AgentInput>): Promise<void> {
    await agentsUpdate(agentId, data)
    await fetchAgents(true)
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
