import { rpc } from './websocket'
import type { ModelEntry } from '@/types/model'

export interface ModelsListResult {
  models: ModelEntry[]
}

export function modelsList(): Promise<ModelsListResult> {
  return rpc('models.list', {})
}
