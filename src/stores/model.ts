import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ModelEntry } from '@/types/model'
import { modelsList } from '@/api/models'
import { logger } from '@/utils/logger'

const TAG = 'modelStore'

export const useModelStore = defineStore('model', () => {
  const models = ref<ModelEntry[]>([])
  const loading = ref(false)
  let lastFetchTime = 0

  async function fetchModels(force = false) {
    if (!force && Date.now() - lastFetchTime < 5 * 60 * 1000) return
    loading.value = true
    try {
      const result = await modelsList()
      models.value = result.models ?? []
      lastFetchTime = Date.now()
    } catch (e) {
      logger.error(TAG, 'fetchModels failed', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return { models, loading, fetchModels }
})
