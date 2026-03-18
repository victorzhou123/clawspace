// 路由守卫 - 未登录拦截

import { useUserStore } from '@/stores/user'
import { logger } from '@/utils/logger'

const TAG = 'guard'

// 不需要登录即可访问的页面
export const WHITE_LIST = ['/pages/auth/login']

/**
 * 检查当前页面是否需要登录，未登录则跳转到登录页
 * 在各业务页面的 onLoad 中调用，可传入 redirect 参数供登录后跳回
 */
export function guardAuth(redirect?: string): boolean {
  const userStore = useUserStore()
  if (userStore.isAuthenticated) return true

  const pages = getCurrentPages()
  const current = pages[pages.length - 1]

  if (!current) {
    logger.warn(TAG, 'guardAuth: no current page, allowing')
    return true
  }

  const route = '/' + current.route
  if (WHITE_LIST.includes(route)) return true

  const loginUrl = redirect
    ? `/pages/auth/login?redirect=${encodeURIComponent(redirect)}`
    : '/pages/auth/login'

  uni.reLaunch({ url: loginUrl })
  return false
}
