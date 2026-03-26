<template>
  <view class="sessions-page" :class="themeClass">
    <view class="nav-bar">
      <view class="nav-back" @tap="() => { onVibrate(); uni.navigateBack(); }">
        <image class="nav-back-icon" :src="theme === 'dark' ? '/static/icon/back-light.svg' : '/static/icon/back-dark.svg'" mode="aspectFit" />
      </view>
      <text class="nav-title">会话列表</text>
      <view style="width: 60rpx;" />
    </view>
    <scroll-view
      class="list"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      :refresher-background="refresherBackground"
      @refresherrefresh="onRefresh"
    >
      <view v-if="!refreshing && sessions.length === 0" class="empty">
        <text class="empty-text">暂无会话，去聊天开始吧</text>
      </view>

      <view
        v-for="(session, index) in displaySessions"
        :key="session.key"
        class="session-item"
        @tap="openSession(session.key)"
        @longpress="onLongPress($event, session.key, session.label || session.derivedTitle || session.displayName || session.key || '')"
      >
        <view class="session-info">
          <text class="session-title">{{ session.label || session.derivedTitle || session.displayName || session.key }}</text>
          <text class="session-preview">{{ session.lastMessagePreview || '暂无消息' }}</text>
        </view>
        <view class="session-meta">
          <text class="session-time">{{ formatTime(session.updatedAt) }}</text>
        </view>
      </view>

      <!-- 免费用户限制提示 -->
      <view v-if="showPaywallHint" class="paywall-hint" @tap="goToPaywall">
        <view class="hint-content">
          <text class="hint-icon">🔒</text>
          <view class="hint-text">
            <text class="hint-title">解锁全部功能</text>
            <text class="hint-desc">查看所有历史会话</text>
          </view>
        </view>
        <text class="hint-arrow">›</text>
      </view>
    </scroll-view>

    <view v-if="menuVisible" class="menu-overlay" @tap="closeMenu">
      <view class="context-menu" :style="{ top: menuTop + 'px', left: menuLeft + 'px' }" @tap.stop>
        <view class="menu-item" @tap="handleMenuAction('rename')">
          <text class="menu-text">重命名</text>
        </view>
        <view class="menu-item" @tap="handleMenuAction('reset')">
          <text class="menu-text">重置会话</text>
        </view>
        <view class="menu-item" @tap="handleMenuAction('delete')">
          <text class="menu-text danger">删除会话</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { guardAuth } from '@/utils/guard'
import { useSessionStore } from '@/stores/session'
import { useChatStore } from '@/stores/chat'
import { usePaywallStore } from '@/stores/paywall'
import { useTheme } from '@/composables/useTheme'
import { useRefresher } from '@/composables/useRefresher'
import { onVibrate } from '@/utils/haptic'

const sessionStore = useSessionStore()
const chatStore = useChatStore()
const paywallStore = usePaywallStore()
const { sessions } = storeToRefs(sessionStore)
const { themeClass, theme } = useTheme()
const { refresherBackground } = useRefresher()
const refreshing = ref(false)
const menuVisible = ref(false)
const menuTop = ref(0)
const menuLeft = ref(0)
const selectedSession = ref({ key: '', title: '' })

// 显示的会话列表（免费用户只显示前3条）
const displaySessions = computed(() => {
  if (paywallStore.isPremium) {
    return sessions.value
  }
  return sessions.value.slice(0, paywallStore.FREE_SESSION_LIMIT)
})

// 是否显示付费墙提示
const showPaywallHint = computed(() => {
  return !paywallStore.isPremium && sessions.value.length > paywallStore.FREE_SESSION_LIMIT
})

// 跳转到付费墙
function goToPaywall() {
  onVibrate()
  uni.navigateTo({
    url: '/pages/paywall/paywall'
  })
}

onLoad(() => { guardAuth() })

onShow(async () => {
  await sessionStore.fetchSessions().catch(() => {})
})

async function onRefresh() {
  refreshing.value = true
  const start = Date.now()
  await sessionStore.fetchSessions().catch(() => {})
  const elapsed = Date.now() - start
  if (elapsed < 500) await new Promise(resolve => setTimeout(resolve, 500 - elapsed))
  refreshing.value = false
}

function openSession(key: string) {
  sessionStore.setCurrentSession(key)
  uni.navigateBack()
}

function onLongPress(e: any, key: string, title: string) {
  selectedSession.value = { key, title }
  const { clientX, clientY } = e.touches?.[0] || e.changedTouches?.[0] || { clientX: 0, clientY: 0 }
  menuLeft.value = clientX
  menuTop.value = clientY
  menuVisible.value = true
}

function closeMenu() {
  menuVisible.value = false
}

function handleMenuAction(action: 'rename' | 'reset' | 'delete') {
  closeMenu()
  const { key, title } = selectedSession.value
  if (action === 'rename') confirmRename(key, title)
  else if (action === 'reset') confirmReset(key)
  else if (action === 'delete') confirmDelete(key)
}

function confirmRename(key: string, currentTitle: string) {
  uni.showModal({
    title: '重命名',
    editable: true,
    placeholderText: currentTitle || '新会话',
    success: async (res) => {
      if (res.confirm && res.content?.trim()) {
        await sessionStore.renameSession(key, res.content.trim()).catch(() => {})
      }
    },
  })
}

function confirmReset(key: string) {
  uni.showModal({
    title: '重置会话',
    content: '将清空该会话的所有消息，确认重置？',
    success: async (res) => {
      if (res.confirm) {
        await sessionStore.resetSession(key).catch(() => {})
        if (sessionStore.currentSessionId === key) {
          chatStore.clearMessages()
        }
      }
    },
  })
}

function confirmDelete(key: string) {
  uni.showModal({
    title: '删除会话',
    content: '删除后无法恢复，确认删除？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await sessionStore.deleteSession(key)
        } catch (e: any) {
          const msg = e?.message || ''
          if (msg.includes('Cannot delete the main session') || msg.includes('main session')) {
            uni.showToast({ title: '主会话无法删除', icon: 'none' })
          } else {
            uni.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    },
  })
}

function formatTime(ts: number | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped lang="scss">
.sessions-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
}

.nav-bar {
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  padding-top: env(safe-area-inset-top);
  height: env(safe-area-inset-top);
  background: var(--nav-bg);
  border-bottom: 1rpx solid var(--nav-border);
  flex-shrink: 0;

  .nav-back {
    width: 60rpx;
    display: flex;
    align-items: center;
    .nav-back-icon { width: 66rpx; height: 66rpx; }
  }

  .nav-title {
    flex: 1;
    text-align: center;
    font-size: 32rpx;
    font-weight: 500;
    color: var(--nav-text);
  }
}

.list {
  flex: 1;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;

  .empty-text {
    font-size: 28rpx;
    color: var(--text-tertiary);
  }
}

.session-item {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-color);

  &:active {
    background: var(--bg-tertiary);
  }
}

.session-info {
  flex: 1;
  overflow: hidden;

  .session-title {
    display: block;
    font-size: 30rpx;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8rpx;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .session-preview {
    display: block;
    font-size: 26rpx;
    color: var(--text-tertiary);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.session-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-left: 24rpx;
  flex-shrink: 0;

  .session-time {
    font-size: 24rpx;
    color: var(--text-tertiary);
  }
}

.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
}

.context-menu {
  position: fixed;
  background: var(--bg-card);
  border-radius: 12rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.15);
  overflow: hidden;
  transform: translate(-50%, -100%) translateY(-20rpx);
  min-width: 200rpx;
}

.menu-item {
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid var(--border-color);

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: var(--bg-tertiary);
  }
}

.menu-text {
  font-size: 28rpx;
  color: var(--text-primary);

  &.danger {
    color: #ff4d4f;
  }
}

.paywall-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  margin: 24rpx 32rpx;
  background: linear-gradient(135deg, rgba(0, 88, 188, 0.1) 0%, rgba(0, 112, 235, 0.05) 100%);
  border-radius: 16rpx;
  border: 2rpx solid rgba(0, 88, 188, 0.2);

  &:active {
    opacity: 0.8;
  }
}

.hint-content {
  display: flex;
  align-items: center;
  gap: 24rpx;
  flex: 1;
}

.hint-icon {
  font-size: 48rpx;
  line-height: 1;
}

.hint-text {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.hint-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.hint-desc {
  font-size: 24rpx;
  color: var(--text-tertiary);
}

.hint-arrow {
  font-size: 48rpx;
  color: var(--text-tertiary);
  font-weight: 300;
}
</style>
