import { rpc } from './websocket'
import type { ToolsCatalogResult } from '@/types/tools'

export function toolsCatalog(agentId?: string): Promise<ToolsCatalogResult> {
  return rpc('tools.catalog', agentId ? { agentId } : {})
}
