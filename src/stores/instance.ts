import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '@/utils/storage'
import { logger } from '@/utils/logger'
import { connectGateway, disconnectGateway } from '@/api/websocket'
import type { Instance } from '@/types/instance'

const TAG = 'instanceStore'
const INSTANCES_KEY = 'instances_list'
const CURRENT_INSTANCE_ID_KEY = 'current_instance_id'

export const useInstanceStore = defineStore('instance', () => {
  const instances = ref<Instance[]>([])
  const currentInstanceId = ref<string | null>(null)

  const currentInstance = computed(() => {
    if (!currentInstanceId.value) return null
    return instances.value.find(i => i.id === currentInstanceId.value) || null
  })

  function loadInstances() {
    instances.value = storage.get<Instance[]>(INSTANCES_KEY) || []
    currentInstanceId.value = storage.get<string>(CURRENT_INSTANCE_ID_KEY) || null
  }

  function saveInstances() {
    storage.set(INSTANCES_KEY, instances.value)
    storage.set(CURRENT_INSTANCE_ID_KEY, currentInstanceId.value)
  }

  function addInstance(instance: Omit<Instance, 'id' | 'lastLoginTime'>): Instance {
    const newInstance: Instance = {
      ...instance,
      id: `instance_${Date.now()}`,
      lastLoginTime: Date.now(),
    }
    instances.value.push(newInstance)
    saveInstances()
    logger.info(TAG, 'instance added', newInstance.id)
    return newInstance
  }

  function updateInstance(id: string, updates: Partial<Omit<Instance, 'id'>>): boolean {
    const index = instances.value.findIndex(i => i.id === id)
    if (index === -1) return false
    instances.value[index] = { ...instances.value[index], ...updates }
    saveInstances()
    logger.info(TAG, 'instance updated', id)
    return true
  }

  function deleteInstance(id: string): boolean {
    const index = instances.value.findIndex(i => i.id === id)
    if (index === -1) return false

    // 如果删除的是当前实例，清空当前实例 ID
    if (id === currentInstanceId.value) {
      currentInstanceId.value = null
    }

    instances.value.splice(index, 1)
    saveInstances()
    logger.info(TAG, 'instance deleted', id)
    return true
  }

  async function switchInstance(id: string): Promise<void> {
    const instance = instances.value.find(i => i.id === id)
    if (!instance) {
      throw new Error('Instance not found')
    }

    disconnectGateway()

    try {
      await connectGateway(instance.url, { type: 'token', token: instance.token })
      currentInstanceId.value = id
      instance.lastLoginTime = Date.now()
      saveInstances()

      // 同步到旧的存储格式以保持兼容
      storage.set('auth_token', instance.token)
      storage.set('instance_url', instance.url)

      logger.info(TAG, 'switched to instance', id)
    } catch (e) {
      logger.error(TAG, 'failed to switch instance', e)
      throw e
    }
  }

  function initFromLegacyStorage(): void {
    const token = storage.get<string>('auth_token')
    const url = storage.get<string>('instance_url')

    if (token && url) {
      loadInstances()

      // 检查是否已存在该实例
      const existing = instances.value.find(i => i.url === url && i.token === token)
      if (existing) {
        currentInstanceId.value = existing.id
        saveInstances()
      } else {
        // 迁移旧数据
        const instance = addInstance({
          url,
          name: new URL(url).hostname,
          token,
        })
        currentInstanceId.value = instance.id
        saveInstances()
        logger.info(TAG, 'migrated legacy instance')
      }
    } else {
      loadInstances()
    }
  }

  return {
    instances,
    currentInstanceId,
    currentInstance,
    loadInstances,
    saveInstances,
    addInstance,
    updateInstance,
    deleteInstance,
    switchInstance,
    initFromLegacyStorage,
  }
})
