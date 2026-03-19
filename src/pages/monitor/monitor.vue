<template>
  <view class="monitor-page">
    <scroll-view
      scroll-y
      class="content"
      refresher-enabled
      :refresher-triggered="loading"
      @refresherrefresh="onRefresh"
    >
      <!-- 健康状态 -->
      <view class="section">
        <text class="section-title">系统健康</text>
        <view class="card">
          <view class="status-row">
            <view class="dot" :class="healthOk ? 'dot-ok' : 'dot-err'" />
            <text class="status-text">{{ healthOk ? '运行正常' : '异常' }}</text>
            <text class="status-time">{{ healthTime }}</text>
          </view>
        </view>
      </view>

      <!-- 用量概览 -->
      <view v-if="usageData" class="section">
        <text class="section-title">API 用量</text>
        <view
          v-for="provider in usageData.providers"
          :key="provider.provider"
          class="card"
        >
          <view class="provider-header">
            <text class="provider-name">{{ provider.displayName }}</text>
            <text v-if="provider.plan" class="provider-plan">{{ provider.plan }}</text>
            <text v-if="provider.error" class="provider-error">{{ provider.error }}</text>
          </view>
          <view
            v-for="win in provider.windows"
            :key="win.label"
            class="usage-row"
          >
            <text class="usage-label">{{ win.label }}</text>
            <view class="progress-bar">
              <view class="progress-fill" :style="{ width: win.usedPercent + '%', background: progressColor(win.usedPercent) }" />
            </view>
            <text class="usage-pct">{{ win.usedPercent.toFixed(1) }}%</text>
          </view>
        </view>
      </view>

      <!-- 会话概览 -->
      <view v-if="statusData" class="section">
        <text class="section-title">会话状态</text>
        <view class="card">
          <view class="info-row">
            <text class="info-label">会话总数</text>
            <text class="info-value">{{ statusData.sessions.count }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">默认模型</text>
            <text class="info-value">{{ statusData.sessions.defaults.model ?? '未设置' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">上下文窗口</text>
            <text class="info-value">{{ statusData.sessions.defaults.contextTokens ?? '-' }}</text>
          </view>
        </view>

        <!-- 最近会话 -->
        <view v-if="statusData.sessions.recent.length" class="card">
          <text class="card-subtitle">最近活跃</text>
          <view
            v-for="s in statusData.sessions.recent.slice(0, 5)"
            :key="s.key"
            class="session-row"
          >
            <view class="session-info">
              <text class="session-key">{{ s.key }}</text>
              <text class="session-model">{{ s.model ?? '-' }}</text>
            </view>
            <view v-if="s.percentUsed != null" class="token-pct">
              <text :class="s.percentUsed > 80 ? 'pct-warn' : 'pct-ok'">{{ s.percentUsed.toFixed(0) }}%</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 心跳 -->
      <view v-if="statusData" class="section">
        <text class="section-title">心跳任务</text>
        <view class="card">
          <view
            v-for="agent in statusData.heartbeat.agents"
            :key="agent.agentId"
            class="info-row"
          >
            <text class="info-label">{{ agent.agentId }}</text>
            <text class="info-value" :class="agent.enabled ? 'text-ok' : 'text-muted'">
              {{ agent.enabled ? agent.every : '已禁用' }}
            </text>
          </view>
        </view>
      </view>

      <view class="bottom-pad" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { guardAuth } from '@/utils/guard'
import { useMonitorStore } from '@/stores/monitor'

const monitorStore = useMonitorStore()
const { healthData, statusData, usageData, loading } = storeToRefs(monitorStore)

const healthOk = computed(() => healthData.value != null)
const healthTime = computed(() => {
  const ts = (healthData.value as any)?.ts
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString()
})

onLoad(() => { guardAuth() })

onShow(async () => {
  await monitorStore.fetchAll().catch(() => {
    uni.showToast({ title: '加载失败', icon: 'none' })
  })
})

async function onRefresh() {
  await monitorStore.fetchAll().catch(() => {})
}

function progressColor(pct: number) {
  if (pct >= 90) return '#ff4d4f'
  if (pct >= 70) return '#fa8c16'
  return '#52c41a'
}
</script>

<style scoped lang="scss">
.monitor-page {
  height: 100vh;
  background: #f5f5f5;
}

.content {
  height: 100%;
}

.section {
  padding: 24rpx 24rpx 0;
}

.section-title {
  display: block;
  font-size: 26rpx;
  color: #999;
  margin-bottom: 12rpx;
  padding-left: 4rpx;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 32rpx;
  margin-bottom: 16rpx;
}

.card-subtitle {
  display: block;
  font-size: 26rpx;
  color: #999;
  margin-bottom: 16rpx;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  flex-shrink: 0;

  &.dot-ok { background: #52c41a; }
  &.dot-err { background: #ff4d4f; }
}

.status-text {
  font-size: 30rpx;
  color: #1a1a1a;
  flex: 1;
}

.status-time {
  font-size: 24rpx;
  color: #999;
}

.provider-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.provider-name {
  font-size: 30rpx;
  color: #1a1a1a;
  font-weight: 500;
  flex: 1;
}

.provider-plan {
  font-size: 22rpx;
  color: #007aff;
  background: rgba(0, 122, 255, 0.1);
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.provider-error {
  font-size: 22rpx;
  color: #ff4d4f;
}

.usage-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;

  &:last-child { margin-bottom: 0; }
}

.usage-label {
  font-size: 26rpx;
  color: #666;
  width: 120rpx;
  flex-shrink: 0;
}

.progress-bar {
  flex: 1;
  height: 12rpx;
  background: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 6rpx;
  transition: width 0.3s;
}

.usage-pct {
  font-size: 24rpx;
  color: #666;
  width: 80rpx;
  text-align: right;
  flex-shrink: 0;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child { border-bottom: none; }
}

.info-label {
  font-size: 28rpx;
  color: #666;
}

.info-value {
  font-size: 28rpx;
  color: #1a1a1a;
}

.session-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child { border-bottom: none; }
}

.session-info {
  flex: 1;

  .session-key {
    display: block;
    font-size: 28rpx;
    color: #1a1a1a;
  }

  .session-model {
    display: block;
    font-size: 24rpx;
    color: #999;
    margin-top: 4rpx;
  }
}

.token-pct {
  flex-shrink: 0;
  margin-left: 16rpx;
}

.pct-ok { font-size: 26rpx; color: #52c41a; }
.pct-warn { font-size: 26rpx; color: #ff4d4f; }
.text-ok { color: #52c41a; }
.text-muted { color: #999; }

.bottom-pad { height: 40rpx; }
</style>
