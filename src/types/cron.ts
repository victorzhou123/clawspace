// Cron 定时任务相关类型

export type CronSessionTarget = 'main' | 'isolated'
export type CronWakeMode = 'next-heartbeat' | 'now'
export type CronRunStatus = 'ok' | 'error' | 'skipped' | 'aborted'

export type CronSchedule =
  | { kind: 'at'; at: string }
  | { kind: 'every'; everyMs: number; anchorMs?: number }
  | { kind: 'cron'; expr: string; tz?: string; staggerMs?: number }

export type CronPayload =
  | { kind: 'systemEvent'; text: string }
  | { kind: 'agentTurn'; message: string; agentId?: string }

export interface CronJobState {
  nextRunAtMs?: number
  runningAtMs?: number
  lastRunAtMs?: number
  lastRunStatus?: CronRunStatus
  lastError?: string
  lastDurationMs?: number
  consecutiveErrors?: number
}

export interface CronJob {
  id: string
  agentId?: string
  sessionKey?: string
  name: string
  description?: string
  enabled: boolean
  deleteAfterRun?: boolean
  createdAtMs: number
  updatedAtMs: number
  schedule: CronSchedule
  sessionTarget: CronSessionTarget
  wakeMode: CronWakeMode
  payload: CronPayload
  state: CronJobState
}

export interface CronJobInput {
  name: string
  description?: string
  enabled?: boolean
  schedule: CronSchedule
  sessionTarget: CronSessionTarget
  wakeMode: CronWakeMode
  payload: CronPayload
}
