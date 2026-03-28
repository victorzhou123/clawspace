/**
 * 等待网络可用
 * @param maxRetries 最大重试次数，默认 3
 * @param initialDelay 初始延迟（毫秒），默认 1000
 * @returns Promise<boolean> 网络是否可用
 */
export async function waitForNetwork(
  maxRetries = 3,
  initialDelay = 1000
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await uni.getNetworkType()

      // 如果网络类型不是 none，说明网络可用
      if (res.networkType !== 'none') {
        return true
      }

      // 网络不可用，等待后重试
      // 每次延迟递增：1s, 2s, 3s
      const delay = initialDelay * (i + 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    } catch (error) {
      console.error('检测网络失败', error)
    }
  }

  return false
}
