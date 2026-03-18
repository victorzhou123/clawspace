// 认证 API

import { rpc } from '@/api/websocket'
import { http } from '@/api/http'

export interface LoginByTokenParams {
  token: string
}

export interface LoginByPasswordParams {
  username: string
  password: string
}

export interface LoginByDeviceTokenParams {
  deviceToken: string
}

export interface AuthResult {
  token: string
  expiresAt?: number
}

// Token 认证
export function loginByToken(params: LoginByTokenParams): Promise<AuthResult> {
  return rpc<AuthResult>('auth.login', { type: 'token', ...params })
}

// 密码认证
export function loginByPassword(params: LoginByPasswordParams): Promise<AuthResult> {
  return rpc<AuthResult>('auth.login', { type: 'password', ...params })
}

// Device Token 认证
export function loginByDeviceToken(params: LoginByDeviceTokenParams): Promise<AuthResult> {
  return rpc<AuthResult>('auth.login', { type: 'device_token', ...params })
}

// 健康检查（用于验证连接和 token 有效性）
export function checkHealth(): Promise<{ status: string }> {
  return http.get<{ status: string }>('/health', { skipAuth: false })
}
