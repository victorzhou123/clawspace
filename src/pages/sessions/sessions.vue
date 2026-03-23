<template>
  <view class="sessions-page" :class="themeClass">
    <view class="nav-bar">
      <view class="nav-back" @tap="() => uni.navigateBack()">
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
        v-for="session in sessions"
        :key="session.key"
        class="session-item"
        @tap="openSession(session.key)"
        @longpress="onLongPress(session.key, session.key || session.label || session.derivedTitle || '')"
      >
        <view class="session-info">
          <text class="session-title">{{ session.key || session.label || session.derivedTitle || session.displayName }}</text>
          <text class="session-preview">{{ session.lastMessagePreview || '暂无消息' }}</text>
        </view>
        <view class="session-meta">
          <text class="session-time">{{ formatTime(session.updatedAt) }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { guardAuth } from '@/utils/guard'
import { useSessionStore } from '@/stores/session'
import { useChatStore } from '@/stores/chat'
import { useTheme } from '@/composables/useTheme'
import { useRefresher } from '@/composables/useRefresher'

const sessionStore = useSessionStore()
const chatStore = useChatStore()
const { sessions } = storeToRefs(sessionStore)
const { themeClass, theme } = useTheme()
const { refresherBackground } = useRefresher()
const refreshing = ref(false)

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

function onLongPress(key: string, title: string) {
  uni.showActionSheet({
    itemList: ['重命名', '重置会话', '删除会话'],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) confirmRename(key, title)
      else if (tapIndex === 1) confirmReset(key)
      else if (tapIndex === 2) confirmDelete(key)
    },
  })
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
        await sessionStore.deleteSession(key).catch(() => {})
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
    .nav-back-icon { width: 44rpx; height: 44rpx; }
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
</style>
