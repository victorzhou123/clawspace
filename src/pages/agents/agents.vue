<template>
  <view class="agents-page">
    <!-- 新建按钮 -->
    <view class="header-action">
      <text class="create-btn" @tap="goCreate">+ 新建</text>
    </view>

    <scroll-view
      class="list"
      scroll-y
      refresher-enabled
      :refresher-triggered="loading"
      @refresherrefresh="onRefresh"
    >
      <view v-if="!loading && agents.length === 0" class="empty">
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
          <text class="avatar-text">{{ agent.name.charAt(0).toUpperCase() }}</text>
        </view>
        <view class="agent-info">
          <text class="agent-name">{{ agent.name }}</text>
          <text class="agent-desc">{{ agent.description || '暂无描述' }}</text>
          <text v-if="agent.model" class="agent-model">{{ agent.model }}</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { guardAuth } from '@/utils/guard'
import { useAgentStore } from '@/stores/agent'
import type { Agent } from '@/types/agent'

const agentStore = useAgentStore()
const { agents, loading } = storeToRefs(agentStore)

onLoad(() => { guardAuth() })

onShow(async () => {
  await agentStore.fetchAgents().catch(() => {})
})

async function onRefresh() {
  await agentStore.fetchAgents().catch(() => {})
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
  background-color: #f5f5f5;
}

.header-action {
  display: flex;
  justify-content: flex-end;
  padding: 16rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;

  .create-btn {
    font-size: 28rpx;
    color: #007aff;
    padding: 8rpx 0;
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
    color: #999;
  }
}

.agent-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;

  &:active {
    background: #f5f5f5;
  }
}

.agent-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  background: #007aff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .avatar-text {
    font-size: 36rpx;
    color: #fff;
    font-weight: bold;
  }
}

.agent-info {
  flex: 1;
  margin: 0 20rpx;
  overflow: hidden;

  .agent-name {
    display: block;
    font-size: 30rpx;
    font-weight: 500;
    color: #1a1a1a;
    margin-bottom: 6rpx;
  }

  .agent-desc {
    display: block;
    font-size: 26rpx;
    color: #999;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    margin-bottom: 4rpx;
  }

  .agent-model {
    display: inline-block;
    font-size: 22rpx;
    color: #007aff;
    background: rgba(0, 122, 255, 0.08);
    padding: 2rpx 12rpx;
    border-radius: 8rpx;
  }
}

.arrow {
  font-size: 40rpx;
  color: #ccc;
  flex-shrink: 0;
}
</style>
