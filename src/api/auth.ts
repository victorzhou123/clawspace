// 认证 API
// OpenClaw 的认证通过 WebSocket 握手（connect 方法）完成，不需要单独的 auth RPC 调用
// 参见 src/api/websocket.ts 中的 connectGateway

import { http } from '@/api/http'

// 健康检查（用于验证连接和 token 有效性）
export function checkHealth(): Promise<{ status: string }> {
  return http.get<{ status: string }>('/health', { skipAuth: false })
}

