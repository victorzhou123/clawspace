// 路由守卫 - 未登录拦截（已禁用跳转）

export const WHITE_LIST = ['/pages/auth/login']

/**
 * 兼容旧调用：不再做登录拦截或跳转
 */
export function guardAuth(): boolean {
  return true
}
