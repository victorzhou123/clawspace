import { computed } from 'vue'
import { useTheme } from './useTheme'

export function useRefresher() {
  const { theme } = useTheme()

  const refresherBackground = computed(() =>
    theme.value === 'dark' ? '#1c1c1e' : '#f8f8f8'
  )

  const refresherDefaultStyle = computed(() =>
    theme.value === 'dark' ? 'white' : 'black'
  )

  return {
    refresherBackground,
    refresherDefaultStyle,
  }
}
