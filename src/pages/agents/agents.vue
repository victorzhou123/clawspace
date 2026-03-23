<template>
  <view class="agents-page" :class="themeClass">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="() => uni.navigateBack()">
        <image class="nav-back-icon" :src="theme === 'dark' ? '/static/icon/back-light.svg' : '/static/icon/back-dark.svg'" mode="aspectFit" />
      </view>
      <text class="nav-title">Agent 管理</text>
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
      <view v-if="!refreshing && agents.length === 0" class="empty">
        <text class="empty-text">暂无 Agent，点击右上角新建</text>
      </view>

      <view
        v-for="agent in agents"
        :key="agent.id"
        class="agent-item"
        @tap="goDetail(agent)"
        @longpress="confirmDelete(agent.id, agent.name)"
      >
        <view class="agent-avatar">
          <text class="avatar-text">{{ (agent.name || agent.id || '?').charAt(0).toUpperCase() }}</text>
        </view>
        <view class="agent-info">
          <text class="agent-name">{{ agent.name }}</text>
          <text class="agent-desc">{{ agent.description || '暂无描述' }}</text>
          <text v-if="agent.model" class="agent-model">{{ agent.model }}</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </scroll-view>

    <view class="fab" @tap="goCreate">
      <text class="fab-text">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { guardAuth } from '@/utils/guard'
import { useAgentStore } from '@/stores/agent'
import type { Agent } from '@/types/agent'
import { useTheme } from '@/composables/useTheme'
import { useRefresher } from '@/composables/useRefresher'

const agentStore = useAgentStore()
const { agents } = storeToRefs(agentStore)
const { themeClass, theme } = useTheme()
const { refresherBackground } = useRefresher()
const refreshing = ref(false)

onLoad(() => { guardAuth() })

onShow(async () => {
  await agentStore.fetchAgents().catch(() => {})
})

async function onRefresh() {
  refreshing.value = true
  const start = Date.now()
  await agentStore.fetchAgents(true).catch(() => {})
  const elapsed = Date.now() - start
  if (elapsed < 500) await new Promise(resolve => setTimeout(resolve, 500 - elapsed))
  refreshing.value = false
}

function goDetail(agent: Agent) {
  agentStore.setCurrentAgent(agent)
  uni.navigateTo({ url: `/pages/agents/detail?agentId=${agent.id}` })
}

function goCreate() {
  uni.navigateTo({ url: '/pages/agents/form' })
}

function confirmDelete(agentId: string, name: string) {
  uni.showModal({
    title: '删除 Agent',
    content: `确认删除「${name}」？删除后无法恢复。`,
    success: async (res) => {
      if (res.confirm) {
        await agentStore.deleteAgent(agentId).catch(() => {
          uni.showToast({ title: '删除失败', icon: 'none' })
        })
      }
    },
  })
}
</script>

<style scoped lang="scss">
.agents-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  position: relative;
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

.list { flex: 1; }

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  .empty-text { font-size: 28rpx; color: var(--text-tertiary); }
}

.agent-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-color);
  &:active { background: var(--bg-tertiary); }
}

.agent-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  .avatar-text { font-size: 36rpx; color: #fff; font-weight: bold; }
}

.agent-info {
  flex: 1;
  margin: 0 20rpx;
  overflow: hidden;

  .agent-name {
    display: block;
    font-size: 30rpx;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 6rpx;
  }

  .agent-desc {
    display: block;
    font-size: 26rpx;
    color: var(--text-tertiary);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    margin-bottom: 4rpx;
  }

  .agent-model {
    display: inline-block;
    font-size: 22rpx;
    color: var(--accent);
    background: var(--accent-light);
    padding: 2rpx 12rpx;
    border-radius: 8rpx;
  }
}

.arrow { font-size: 40rpx; color: var(--text-tertiary); flex-shrink: 0; }

.fab {
  position: fixed;
  right: 48rpx;
  bottom: calc(48rpx + env(safe-area-inset-bottom));
  width: 100rpx;
  height: 100rpx;
  background: var(--accent);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.4);
  &:active { opacity: 0.85; }
}

.fab-text {
  font-size: 56rpx;
  color: #fff;
  line-height: 1;
  margin-top: -4rpx;
}
</style>
