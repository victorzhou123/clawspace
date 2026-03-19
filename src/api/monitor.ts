import { rpc } from './websocket'
import type { HealthSnapshot, StatusSummary, UsageSummary } from '@/types/monitor'

export function health(): Promise<HealthSnapshot> {
  return rpc('health', {})
}

export function status(): Promise<StatusSummary> {
  return rpc('status', {})
}

export function usageStatus(): Promise<UsageSummary> {
  return rpc('usage.status', {})
}
