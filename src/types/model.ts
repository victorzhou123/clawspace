// 模型相关类型

export interface ModelEntry {
  id: string
  label?: string
  provider?: string
  contextWindow?: number
  supportsVision?: boolean
  supportsStreaming?: boolean
}
