// 系统监控相关类型

export interface UsageWindow {
  label: string
  usedPercent: number
  resetAt?: number
}

export interface ProviderUsageSnapshot {
  provider: string
  displayName: string
  windows: UsageWindow[]
  plan?: string
  error?: string
}

export interface UsageSummary {
  updatedAt: number
  providers: ProviderUsageSnapshot[]
}

export interface SessionStatus {
  agentId?: string
  key: string
  kind: 'direct' | 'group' | 'global' | 'unknown'
  sessionId?: string
  updatedAt: number | null
  age: number | null
  model: string | null
  totalTokens: number | null
  percentUsed: number | null
  remainingTokens: number | null
  contextTokens: number | null
  flags: string[]
}

export interface StatusSummary {
  heartbeat: {
    defaultAgentId: string
    agents: Array<{ agentId: string; enabled: boolean; every: string }>
  }
  channelSummary: string[]
  sessions: {
    count: number
    defaults: { model: string | null; contextTokens: number | null }
    recent: SessionStatus[]
  }
}

export interface HealthSnapshot {
  ts: number
  ok?: boolean
  [key: string]: unknown
}
