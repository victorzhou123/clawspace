import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { HealthSnapshot, StatusSummary, UsageSummary } from '@/types/monitor'
import { health, status, usageStatus } from '@/api/monitor'
import { logger } from '@/utils/logger'

const TAG = 'monitorStore'

export const useMonitorStore = defineStore('monitor', () => {
  const healthData = ref<HealthSnapshot | null>(null)
  const statusData = ref<StatusSummary | null>(null)
  const usageData = ref<UsageSummary | null>(null)
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const [h, s, u] = await Promise.all([health(), status(), usageStatus()])
      healthData.value = h
      statusData.value = s
      usageData.value = u
    } catch (e) {
      logger.error(TAG, 'fetchAll failed', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return { healthData, statusData, usageData, loading, fetchAll }
})
