<template>
  <view class="detail-page" :class="themeClass">
    <view class="nav-bar">
      <view class="nav-back" @tap="() => uni.navigateBack()">
        <image class="nav-back-icon" :src="theme === 'dark' ? '/static/icon/back-light.svg' : '/static/icon/back-dark.svg'" mode="aspectFit" />
      </view>
      <text class="nav-title">{{ navTitle }}</text>
      <view style="width: 60rpx;" />
    </view>
    <view v-if="loading" class="loading-mask">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else-if="agent">
      <scroll-view scroll-y class="content">
        <!-- 基本信息 -->
        <view class="card">
          <view class="agent-header">
            <view class="agent-avatar">
              <text class="avatar-text">{{ (agent.name || agent.id || '?').charAt(0).toUpperCase() }}</text>
            </view>
            <view class="agent-title">
              <text class="agent-name">{{ agent.name }}</text>
              <text v-if="agent.model" class="agent-model">{{ agent.model }}</text>
            </view>
          </view>
          <text v-if="agent.description" class="agent-desc">{{ agent.description }}</text>
        </view>

        <!-- 系统提示词 -->
        <view v-if="agent.systemPrompt" class="card">
          <text class="section-label">系统提示词</text>
          <text class="system-prompt" :selectable="true">{{ agent.systemPrompt }}</text>
        </view>

        <!-- 工具列表 -->
        <view v-if="agent.tools && agent.tools.length > 0" class="card">
          <text class="section-label">已启用工具</text>
          <view class="tools-list">
            <text v-for="tool in agent.tools" :key="tool" class="tool-tag">{{ tool }}</text>
          </view>
        </view>

        <!-- 元信息 -->
        <view class="card meta-card">
          <view class="meta-row">
            <text class="meta-label">创建时间</text>
            <text class="meta-value">{{ formatTime(agent.createdAt) }}</text>
          </view>
          <view class="meta-row">
            <text class="meta-label">更新时间</text>
            <text class="meta-value">{{ formatTime(agent.updatedAt) }}</text>
          </view>
          <view class="meta-row">
            <text class="meta-label">Agent ID</text>
            <text class="meta-value id-text" :selectable="true">{{ agent.id }}</text>
          </view>
        </view>

        <!-- 文件管理 -->
        <view class="card action-card" @tap="goFiles">
          <text class="action-label">工作区文件</text>
          <text class="arrow">›</text>
        </view>
      </scroll-view>

      <!-- 操作按钮 -->
      <view class="footer">
        <button class="btn-edit" @tap="goEdit">编辑</button>
        <button class="btn-delete" @tap="confirmDelete">删除</button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { guardAuth } from '@/utils/guard'
import { useAgentStore } from '@/stores/agent'
import type { Agent } from '@/types/agent'
import { useTheme } from '@/composables/useTheme'

const agentStore = useAgentStore()
const agent = ref<Agent | null>(null)
const loading = ref(false)
const navTitle = ref('Agent 详情')
const { themeClass, theme } = useTheme()

onLoad(async (options) => {
  if (!guardAuth()) return
  const agentId = options?.agentId as string | undefined
  if (!agentId) {
    uni.navigateBack()
    return
  }
  loading.value = true
  try {
    await agentStore.fetchAgents()
    agent.value = agentStore.agents.find(a => a.id === agentId) ?? null
    if (!agent.value) throw new Error('not found')
    navTitle.value = agent.value.name
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  } finally {
    loading.value = false
  }
})

function formatTime(ts: number): string {
  if (!ts) return '-'
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function goEdit() {
  uni.navigateTo({ url: `/pages/agents/form?agentId=${agent.value!.id}` })
}

function goFiles() {
  uni.navigateTo({ url: `/pages/agents/files?agentId=${agent.value!.id}` })
}

function confirmDelete() {
  uni.showModal({
    title: '删除 Agent',
    content: `确认删除「${agent.value!.name}」？删除后无法恢复。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await agentStore.deleteAgent(agent.value!.id)
          uni.navigateBack()
        } catch {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}
</script>

<style scoped lang="scss">
.detail-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
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
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.loading-mask {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;

  .loading-text {
    font-size: 28rpx;
    color: var(--text-tertiary);
  }
}

.content {
  flex: 1;
}

.card {
  margin: 24rpx 24rpx 0;
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 32rpx;
}

.agent-header {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 16rpx;
}

.agent-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .avatar-text {
    font-size: 44rpx;
    color: #fff;
    font-weight: bold;
  }
}

.agent-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;

  .agent-name {
    font-size: 36rpx;
    font-weight: 600;
    color: var(--text-primary);
  }

  .agent-model {
    font-size: 24rpx;
    color: var(--accent);
    background: var(--accent-light);
    padding: 4rpx 16rpx;
    border-radius: 8rpx;
    align-self: flex-start;
  }
}

.agent-desc {
  font-size: 28rpx;
  color: var(--text-secondary);
  line-height: 1.6;
}

.section-label {
  display: block;
  font-size: 26rpx;
  color: var(--text-tertiary);
  margin-bottom: 16rpx;
}

.system-prompt {
  font-size: 28rpx;
  color: var(--text-primary);
  line-height: 1.7;
  white-space: pre-wrap;
}

.tools-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tool-tag {
  font-size: 24rpx;
  color: #52c41a;
  background: rgba(82, 196, 26, 0.08);
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.meta-card {
  margin-bottom: 24rpx;
}

.action-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
  cursor: pointer;
  &:active { opacity: 0.7; }

  .action-label { font-size: 30rpx; color: var(--text-primary); }
  .arrow { font-size: 40rpx; color: var(--text-tertiary); }
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--border-color);

  &:last-child {
    border-bottom: none;
  }
}

.meta-label {
  font-size: 28rpx;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.meta-value {
  font-size: 28rpx;
  color: var(--text-primary);
  text-align: right;
  flex: 1;
  margin-left: 24rpx;
}

.id-text {
  font-size: 22rpx;
  color: var(--text-tertiary);
  word-break: break-all;
}

.footer {
  display: flex;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  background: var(--bg-card);
  border-top: 1rpx solid var(--border-color);
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}

.btn-edit {
  flex: 1;
  height: 88rpx;
  background: var(--accent);
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
  border: none;
}

.btn-delete {
  flex: 1;
  height: 88rpx;
  background: transparent;
  color: var(--danger);
  border-radius: 16rpx;
  font-size: 32rpx;
  border: 1rpx solid var(--danger);
}
</style>
