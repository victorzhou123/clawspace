// 本地存储封装（uni.storage）

const PREFIX = 'clawspace_'

function key(k: string): string {
  return PREFIX + k
}

export const storage = {
  get<T>(k: string): T | null {
    try {
      const val = uni.getStorageSync(key(k))
      return val !== '' ? (val as T) : null
    } catch {
      return null
    }
  },

  set(k: string, val: unknown): void {
    try {
      uni.setStorageSync(key(k), val)
    } catch {
      // ignore
    }
  },

  remove(k: string): void {
    try {
      uni.removeStorageSync(key(k))
    } catch {
      // ignore
    }
  },

  clear(): void {
    try {
      const res = uni.getStorageInfoSync()
      res.keys.filter(k => k.startsWith(PREFIX)).forEach(k => uni.removeStorageSync(k))
    } catch {
      // ignore
    }
  },
}
