<template>
  <view class="sessions-page">
    <scroll-view
      class="list"
      scroll-y
      refresher-enabled
      :refresher-triggered="loading"
      @refresherrefresh="onRefresh"
    >
      <view v-if="!loading && sessions.length === 0" class="empty">
        <text class="empty-text">暂无会话，去聊天开始吧</text>
      </view>

      <view
        v-for="session in sessions"
        :key="session.key"
        class="session-item"
        @tap="openSession(session.key)"
        @longpress="onLongPress(session.key, session.label || session.derivedTitle || '')"
      >
        <view class="session-info">
          <text class="session-title">{{ session.label || session.derivedTitle || session.displayName || session.key }}</text>
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
import { onLoad, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { guardAuth } from '@/utils/guard'
import { useSessionStore } from '@/stores/session'
import { useChatStore } from '@/stores/chat'

const sessionStore = useSessionStore()
const chatStore = useChatStore()
const { sessions, loading } = storeToRefs(sessionStore)

onLoad(() => { guardAuth() })

onShow(async () => {
  await sessionStore.fetchSessions().catch(() => {})
})

async function onRefresh() {
  await sessionStore.fetchSessions().catch(() => {})
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
  background-color: #f5f5f5;
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
    color: #999;
  }
}

.session-item {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;

  &:active {
    background: #f5f5f5;
  }
}

.session-info {
  flex: 1;
  overflow: hidden;

  .session-title {
    display: block;
    font-size: 30rpx;
    font-weight: 500;
    color: #1a1a1a;
    margin-bottom: 8rpx;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .session-preview {
    display: block;
    font-size: 26rpx;
    color: #999;
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
    color: #bbb;
  }
}
</style>
