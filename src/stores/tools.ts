import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ToolGroup } from '@/types/tools'
import { toolsCatalog } from '@/api/tools'
import { logger } from '@/utils/logger'

const TAG = 'toolsStore'

export const useToolsStore = defineStore('tools', () => {
  const groups = ref<ToolGroup[]>([])
  const loading = ref(false)
  let lastFetchTime = 0

  async function fetchCatalog(agentId?: string) {
    if (!agentId && Date.now() - lastFetchTime < 5 * 60 * 1000) return
    loading.value = true
    try {
      const result = await toolsCatalog(agentId)
      groups.value = result.groups ?? []
      lastFetchTime = Date.now()
    } catch (e) {
      logger.error(TAG, 'fetchCatalog failed', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return { groups, loading, fetchCatalog }
})
