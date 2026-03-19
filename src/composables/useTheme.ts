import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'

export function useTheme() {
  const themeStore = useThemeStore()
  const themeClass = computed(() => `theme-${themeStore.theme}`)
  return { themeClass, theme: themeStore.theme, toggle: themeStore.toggle, setTheme: themeStore.setTheme }
}
