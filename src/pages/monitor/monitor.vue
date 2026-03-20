<template>
  <view class="monitor-page" :class="themeClass">
    <view class="nav-bar">
      <view class="nav-back" @tap="() => uni.navigateBack()">
        <text class="nav-back-text">‹</text>
      </view>
      <text class="nav-title">系统状态</text>
      <view style="width: 60rpx;" />
    </view>
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
import { useTheme } from '@/composables/useTheme'

const monitorStore = useMonitorStore()
const { healthData, statusData, usageData, loading } = storeToRefs(monitorStore)
const { themeClass } = useTheme()

const healthOk = computed(() => healthData.value?.ok === true)
const healthTime = computed(() => {
  const ts = healthData.value?.ts
  if (!ts) return ''
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
})

onLoad(() => { guardAuth() })

onShow(async () => {
  await monitorStore.fetchAll().catch(() => {
    uni.showToast({ title: '加载失败', icon: 'none' })
  })
})

async function onRefresh() {
  await monitorStore.fetchAll(true).catch(() => {})
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
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.nav-bar {
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  padding-top: env(safe-area-inset-top);
  height: calc(88rpx + env(safe-area-inset-top));
  background: var(--nav-bg);
  border-bottom: 1rpx solid var(--nav-border);
  flex-shrink: 0;

  .nav-back {
    width: 60rpx;
    display: flex;
    align-items: center;
    .nav-back-text { font-size: 56rpx; color: var(--accent); line-height: 1; margin-top: -4rpx; }
  }

  .nav-title {
    flex: 1;
    text-align: center;
    font-size: 32rpx;
    font-weight: 500;
    color: var(--nav-text);
  }
}

.content {
  flex: 1;
}

.section {
  padding: 24rpx 24rpx 0;
}

.section-title {
  display: block;
  font-size: 26rpx;
  color: var(--text-tertiary);
  margin-bottom: 12rpx;
  padding-left: 4rpx;
}

.card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 24rpx 32rpx;
  margin-bottom: 16rpx;
}

.card-subtitle {
  display: block;
  font-size: 26rpx;
  color: var(--text-tertiary);
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
  color: var(--text-primary);
  flex: 1;
}

.status-time {
  font-size: 24rpx;
  color: var(--text-tertiary);
}

.provider-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.provider-name {
  font-size: 30rpx;
  color: var(--text-primary);
  font-weight: 500;
  flex: 1;
}

.provider-plan {
  font-size: 22rpx;
  color: var(--accent);
  background: var(--accent-light);
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.provider-error {
  font-size: 22rpx;
  color: var(--danger);
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
  color: var(--text-secondary);
  width: 120rpx;
  flex-shrink: 0;
}

.progress-bar {
  flex: 1;
  height: 12rpx;
  background: var(--bg-tertiary);
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
  color: var(--text-secondary);
  width: 80rpx;
  text-align: right;
  flex-shrink: 0;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--border-color);

  &:last-child { border-bottom: none; }
}

.info-label {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.info-value {
  font-size: 28rpx;
  color: var(--text-primary);
}

.session-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--border-color);

  &:last-child { border-bottom: none; }
}

.session-info {
  flex: 1;

  .session-key {
    display: block;
    font-size: 28rpx;
    color: var(--text-primary);
  }

  .session-model {
    display: block;
    font-size: 24rpx;
    color: var(--text-tertiary);
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
.text-muted { color: var(--text-tertiary); }

.bottom-pad { height: 40rpx; }
</style>
