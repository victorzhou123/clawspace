import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Agent } from '@/types/agent'
import { agentsList, agentsCreate, agentsUpdate, agentsDelete, agentsGet } from '@/api/agents'
import type { AgentInput } from '@/api/agents'
import { logger } from '@/utils/logger'

const TAG = 'agentStore'

export const useAgentStore = defineStore('agent', () => {
  const agents = ref<Agent[]>([])
  const loading = ref(false)
  const currentAgent = ref<Agent | null>(null)
  let lastFetchTime = 0

  async function fetchAgents(force = false) {
    // 5 分钟内不重复拉取，除非 force=true
    if (!force && Date.now() - lastFetchTime < 5 * 60 * 1000) return

    loading.value = true
    try {
      const result = await agentsList({ page: 1, pageSize: 50 })
      agents.value = result.list
      lastFetchTime = Date.now()
    } catch (e) {
      logger.error(TAG, 'fetchAgents failed', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getAgent(agentId: string): Promise<Agent> {
    return await agentsGet(agentId)
  }

  async function createAgent(data: AgentInput): Promise<Agent> {
    const agent = await agentsCreate(data)
    // 创建成功后重新拉取列表，保证顺序一致
    await fetchAgents(true)
    return agent
  }

  async function updateAgent(agentId: string, data: Partial<AgentInput>): Promise<Agent> {
    const updated = await agentsUpdate(agentId, data)
    const idx = agents.value.findIndex(a => a.id === agentId)
    if (idx !== -1) {
      agents.value[idx] = updated
    } else {
      // agent 不在列表中，重新拉取
      await fetchAgents(true)
    }
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
    getAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    setCurrentAgent,
  }
})
