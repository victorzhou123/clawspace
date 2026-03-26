import http from './http'

/**
 * 验证购买收据请求
 */
export interface VerifyReceiptRequest {
  receipt: string // Apple 收据
  transactionId: string // 原始订单号
  productId: string // 产品ID
}

/**
 * 验证购买收据响应
 */
export interface VerifyReceiptResponse {
  success: boolean
  isPremium: boolean
  message?: string
}

/**
 * 恢复购买请求
 */
export interface RestorePurchaseRequest {
  receipt: string // Apple 收据
}

/**
 * 恢复购买响应
 */
export interface RestorePurchaseResponse {
  success: boolean
  isPremium: boolean
  transactionId?: string
  message?: string
}

/**
 * 验证购买收据
 * @param data 验证请求数据
 */
export const verifyReceipt = (data: VerifyReceiptRequest) =>
  http.post<VerifyReceiptResponse>('/api/payment/verify-receipt', data)

/**
 * 恢复购买
 * @param data 恢复购买请求数据
 */
export const restorePurchase = (data: RestorePurchaseRequest) =>
  http.post<RestorePurchaseResponse>('/api/payment/restore', data)

/**
 * 获取购买状态
 */
export const getPurchaseStatus = () =>
  http.get<{ isPremium: boolean; transactionId?: string }>('/api/payment/status')
