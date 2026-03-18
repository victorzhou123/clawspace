// HTTP 请求封装（uni.request）

import { logger } from '@/utils/logger'
import { storage } from '@/utils/storage'

const TAG = 'HTTP'
const TIMEOUT = 15000

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, unknown>
  headers?: Record<string, string>
  skipAuth?: boolean
}

interface HttpResponse<T = unknown> {
  code: number
  data: T
  message: string
}

function getBaseUrl(): string {
  const url = import.meta.env.VITE_GATEWAY_HTTP_URL as string || ''
  if (!url && import.meta.env.DEV) logger.warn(TAG, 'VITE_GATEWAY_HTTP_URL is not set')
  return url
}

function getAuthHeader(): Record<string, string> {
  const token = storage.get<string>('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', data, headers = {}, skipAuth = false } = options
  const url = getBaseUrl() + path
  const authHeaders = skipAuth ? {} : getAuthHeader()

  logger.debug(TAG, `${method} ${path}`)

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method,
      data,
      timeout: TIMEOUT,
      header: { 'Content-Type': 'application/json', ...authHeaders, ...headers },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve((res.data as HttpResponse<T>).data ?? res.data as T)
        } else {
          const msg = (res.data as HttpResponse)?.message || `HTTP ${res.statusCode}`
          logger.warn(TAG, `request failed: ${msg}`)
          reject(new Error(msg))
        }
      },
      fail(err) {
        logger.error(TAG, 'request error', err)
        reject(new Error(err.errMsg || 'Network error'))
      },
    })
  })
}

export const http = {
  get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'data'>): Promise<T> {
    return request<T>(path, { ...options, method: 'GET' })
  },
  post<T>(path: string, data?: Record<string, unknown>, options?: Omit<RequestOptions, 'method' | 'data'>): Promise<T> {
    return request<T>(path, { ...options, method: 'POST', data })
  },
  put<T>(path: string, data?: Record<string, unknown>, options?: Omit<RequestOptions, 'method' | 'data'>): Promise<T> {
    return request<T>(path, { ...options, method: 'PUT', data })
  },
  delete<T>(path: string, options?: Omit<RequestOptions, 'method' | 'data'>): Promise<T> {
    return request<T>(path, { ...options, method: 'DELETE' })
  },
}
