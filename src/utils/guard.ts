// 路由守卫 - 未登录拦截

import { useUserStore } from '@/stores/user'

// 不需要登录即可访问的页面
const WHITE_LIST = ['/pages/auth/login']

/**
 * 检查当前页面是否需要登录，未登录则跳转到登录页
 * 在各业务页面的 onLoad 中调用
 */
export function guardAuth(): boolean {
  const userStore = useUserStore()
  if (userStore.isAuthenticated) return true

  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const route = '/' + (current?.route ?? '')

  if (WHITE_LIST.includes(route)) return true

  uni.reLaunch({ url: '/pages/auth/login' })
  return false
}
