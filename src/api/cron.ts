// Cron 定时任务 API

import { rpc } from './websocket'
import type { CronJob, CronJobInput } from '@/types/cron'

export interface CronListResult {
  jobs: CronJob[]
  total: number
}

export function cronList(params?: { includeDisabled?: boolean; limit?: number; offset?: number }): Promise<CronListResult> {
  return rpc('cron.list', params ?? {})
}

export function cronAdd(data: CronJobInput): Promise<{ job: CronJob }> {
  return rpc('cron.add', data)
}

export function cronUpdate(id: string, patch: Partial<CronJobInput> & { enabled?: boolean }): Promise<{ job: CronJob }> {
  return rpc('cron.update', { id, patch })
}

export function cronRemove(id: string): Promise<{ ok: boolean }> {
  return rpc('cron.remove', { id })
}

export function cronRun(id: string): Promise<{ ok: boolean }> {
  return rpc('cron.run', { id, mode: 'force' })
}
