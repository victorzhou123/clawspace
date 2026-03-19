// 工具相关类型

export interface ToolEntry {
  id: string
  label: string
  description: string
  source: 'core' | 'plugin'
  pluginId?: string
  optional?: boolean
  defaultProfiles?: string[]
}

export interface ToolGroup {
  id: string
  label: string
  source: 'core' | 'plugin'
  pluginId?: string
  tools: ToolEntry[]
}

export interface ToolsCatalogResult {
  agentId: string
  groups: ToolGroup[]
}
