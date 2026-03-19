import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'dark' | 'light'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>((uni.getStorageSync('theme') as Theme) || 'dark')

  watch(theme, (val) => {
    uni.setStorageSync('theme', val)
  })

  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(val: Theme) {
    theme.value = val
  }

  return { theme, toggle, setTheme }
})
