import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ToolGroup } from '@/types/tools'
import { toolsCatalog } from '@/api/tools'
import { logger } from '@/utils/logger'

const TAG = 'toolsStore'
const CACHE_TTL = 60 * 1000 // 1 分钟

export const useToolsStore = defineStore('tools', () => {
  const groups = ref<ToolGroup[]>([])
  const loading = ref(false)
  const fetchTimes = new Map<string, number>()

  async function fetchCatalog(agentId?: string) {
    const cacheKey = agentId ?? '__default__'
    const lastFetch = fetchTimes.get(cacheKey) ?? 0
    if (Date.now() - lastFetch < CACHE_TTL) return
    loading.value = true
    try {
      const result = await toolsCatalog(agentId)
      groups.value = result.groups ?? []
      fetchTimes.set(cacheKey, Date.now())
    } catch (e) {
      logger.error(TAG, 'fetchCatalog failed', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return { groups, loading, fetchCatalog }
})
