import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { HealthSnapshot, StatusSummary, UsageSummary } from '@/types/monitor'
import { health, status, usageStatus } from '@/api/monitor'
import { logger } from '@/utils/logger'

const TAG = 'monitorStore'
const CACHE_TTL = 30000

export const useMonitorStore = defineStore('monitor', () => {
  const healthData = ref<HealthSnapshot | null>(null)
  const statusData = ref<StatusSummary | null>(null)
  const usageData = ref<UsageSummary | null>(null)
  const loading = ref(false)
  let lastFetchAt = 0

  async function fetchAll(force = false) {
    if (!force && Date.now() - lastFetchAt < CACHE_TTL) return
    loading.value = true
    try {
      const [h, s, u] = await Promise.allSettled([health(), status(), usageStatus()])
      if (h.status === 'fulfilled') healthData.value = h.value
      else logger.warn(TAG, 'health failed', h.reason)
      if (s.status === 'fulfilled') statusData.value = s.value
      else logger.warn(TAG, 'status failed', s.reason)
      if (u.status === 'fulfilled') usageData.value = u.value
      else logger.warn(TAG, 'usageStatus failed', u.reason)
      lastFetchAt = Date.now()
    } finally {
      loading.value = false
    }
  }

  return { healthData, statusData, usageData, loading, fetchAll }
})
