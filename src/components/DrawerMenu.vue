<template>
  <view v-if="visible" class="drawer-mask" @tap="close" />
  <view class="drawer" :class="[visible ? 'drawer-open' : 'drawer-closed', themeClass]">
    <view class="drawer-header">
      <view class="user-avatar">
        <text class="avatar-text">{{ userInitial }}</text>
      </view>
      <view class="user-info">
        <text class="user-name">{{ userName }}</text>
        <text class="user-instance">{{ instanceUrl }}</text>
      </view>
    </view>

    <view class="new-session-btn" @tap="onNewSession">
      <text class="new-session-icon">＋</text>
    </view>

    <view class="section-title">会话</view>
    <view class="session-list-wrapper">
      <scroll-view scroll-y class="session-list" refresher-enabled :refresher-triggered="sessionLoading" @refresherrefresh="onRefreshSessions">
        <view v-if="sessions.length === 0 && !sessionLoading" class="empty-tip">
          <text>暂无会话</text>
        </view>
        <view
          v-for="s in sessions" :key="s.key"
          class="session-item" :class="s.key === currentSessionId ? 'session-active' : ''"
          @tap="selectSession(s.key)"
          @longpress="onSessionLongPress(s.key, s.key || s.label || s.derivedTitle || '')"
        >
          <view class="session-item-inner">
            <text class="session-title">{{ s.key || s.label || s.derivedTitle || s.displayName }}</text>
            <text class="session-preview">{{ s.lastMessagePreview || '暂无消息' }}</text>
          </view>
          <text class="session-time">{{ formatTime(s.updatedAt) }}</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useSessionStore } from '@/stores/session'
import { useChatStore } from '@/stores/chat'
import { useTheme } from '@/composables/useTheme'
import { agentsList } from '@/api/agents'
import { sessionsPatch, sessionsReset } from '@/api/sessions'
import type { Agent } from '@/types/agent'
import { onVibrate } from '@/utils/haptic'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const userStore = useUserStore()
const sessionStore = useSessionStore()
const chatStore = useChatStore()
const { instanceUrl } = storeToRefs(userStore)
const { sessions, loading: sessionLoading, currentSessionId } = storeToRefs(sessionStore)
const { themeClass } = useTheme()
const creatingSession = ref(false)

async function onNewSession() {
  try {
    creatingSession.value = true
    const { agents } = await agentsList()
    if (!agents || agents.length === 0) {
      uni.showToast({ title: '暂无可用 Agent', icon: 'none' })
      return
    }
    const itemList = agents.map((a: Agent) => `${a.avatar ?? '🤖'} ${a.name}`)
    uni.showActionSheet({
      itemList,
      success: async ({ tapIndex }) => {
        try {
          const agent = agents[tapIndex]
          const agentId = agent.id ?? agent.agentId
          const timestamp = Date.now()
          const key = `agent:${agentId}:dashboard:${timestamp}`
          const label = `新会话-${new Date(timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`
          await sessionsReset(key)
          const patchData: { label: string; model?: string } = { label }
          if (agent.model) patchData.model = agent.model
          await sessionsPatch(key, patchData)
          await sessionStore.fetchSessions()
          sessionStore.setCurrentSession(key)
          close()
        } catch (e) {
          uni.showToast({ title: '创建失败', icon: 'none' })
        }
      },
    })
  } catch (e) {
    uni.showToast({ title: '获取 Agent 失败', icon: 'none' })
  } finally {
    creatingSession.value = false
  }
}


const userName = computed(() => {
  if (instanceUrl.value) {
    try { return new URL(instanceUrl.value).hostname } catch { /* ignore */ }
    return instanceUrl.value
  }
  return '未知实例'
})
const userInitial = computed(() => userName.value.charAt(0).toUpperCase())

function close() { emit('close') }

async function onRefreshSessions() {
  await sessionStore.fetchSessions().catch(() => {})
}

function selectSession(key: string) {
  onVibrate()
  sessionStore.setCurrentSession(key)
  close()
}

function onSessionLongPress(key: string, title: string) {
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
    title: '重命名', editable: true, placeholderText: currentTitle || '新会话',
    success: async (res) => {
      if (res.confirm && res.content?.trim())
        await sessionStore.renameSession(key, res.content.trim()).catch(() => {})
    },
  })
}

function confirmReset(key: string) {
  uni.showModal({
    title: '重置会话', content: '将清空该会话的所有消息，确认重置？',
    success: async (res) => {
      if (res.confirm) {
        await sessionStore.resetSession(key).catch(() => {})
        if (sessionStore.currentSessionId === key) chatStore.clearMessages()
      }
    },
  })
}

function confirmDelete(key: string) {
  uni.showModal({
    title: '删除会话', content: '删除后无法恢复，确认删除？',
    success: async (res) => {
      if (res.confirm) await sessionStore.deleteSession(key).catch(() => {})
    },
  })
}

function formatTime(ts: number | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString())
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped lang="scss">
.drawer-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
}

.drawer {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: 680rpx;
  background: var(--drawer-bg);
  z-index: 999;
  display: flex;
  flex-direction: column;
  transition: transform 0.28s ease;
  padding-top: env(safe-area-inset-top);
}

.drawer-closed { transform: translateX(-100%); }
.drawer-open { transform: translateX(0); }

.drawer-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 32rpx 32rpx 24rpx;
  border-bottom: 1rpx solid var(--border-light);
}

.user-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  .avatar-text { font-size: 36rpx; color: #fff; font-weight: bold; }
}

.user-info {
  flex: 1;
  overflow: hidden;
  .user-name { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-primary); margin-bottom: 4rpx; }
  .user-instance { display: block; font-size: 22rpx; color: var(--text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}

.section-title {
  font-size: 22rpx;
  color: var(--text-tertiary);
  padding: 20rpx 32rpx 8rpx;
  text-transform: uppercase;
  letter-spacing: 2rpx;
}

.session-list { flex: 1; min-height: 0; }

.empty-tip {
  padding: 48rpx 32rpx;
  text { font-size: 26rpx; color: var(--text-tertiary); }
}

.session-item {
  display: flex;
  align-items: center;
  padding: 20rpx 32rpx;
  gap: 12rpx;
  border-bottom: 1rpx solid var(--drawer-divider);
  &:active { background: var(--bg-tertiary); }
  &.session-active { background: var(--drawer-item-active); }
}

.session-item-inner {
  flex: 1;
  overflow: hidden;
  .session-title { display: block; font-size: 28rpx; color: var(--text-primary); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-bottom: 4rpx; }
  .session-preview { display: block; font-size: 24rpx; color: var(--text-tertiary); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
}

.session-time { font-size: 22rpx; color: var(--text-tertiary); flex-shrink: 0; }

.new-session-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16rpx 32rpx;
  height: 72rpx;
  border-radius: 16rpx;
  border: 1rpx dashed var(--border-color);
  &:active { background: var(--bg-tertiary); }
}

.new-session-icon {
  font-size: 40rpx;
  color: var(--text-secondary);
  line-height: 1;
}

.nav-list {
  border-top: 1rpx solid var(--border-light);
  padding: 12rpx 0;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 32rpx;
  &:active { background: var(--bg-tertiary); }
  .nav-icon { font-size: 36rpx; width: 48rpx; text-align: center; }
  .nav-label { font-size: 30rpx; color: var(--text-primary); }
}
</style>
