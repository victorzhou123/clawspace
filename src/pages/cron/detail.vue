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

    <template v-else-if="job">
      <scroll-view scroll-y class="content">
        <!-- 基本信息 -->
        <view class="card">
          <view class="title-row">
            <text class="job-name">{{ job.name }}</text>
            <view class="job-status" :class="job.enabled ? 'status-on' : 'status-off'">
              <text>{{ job.enabled ? '启用' : '停用' }}</text>
            </view>
          </view>
          <text v-if="job.description" class="job-desc">{{ job.description }}</text>
        </view>

        <!-- 调度配置 -->
        <view class="card">
          <text class="section-label">调度</text>
          <view class="info-row">
            <text class="info-label">类型</text>
            <text class="info-value">{{ scheduleKindLabel(job.schedule.kind) }}</text>
          </view>
          <view v-if="job.schedule.kind === 'cron'" class="info-row">
            <text class="info-label">表达式</text>
            <text class="info-value mono">{{ job.schedule.expr }}</text>
          </view>
          <view v-if="job.schedule.kind === 'every'" class="info-row">
            <text class="info-label">间隔</text>
            <text class="info-value">{{ formatEvery(job.schedule.everyMs) }}</text>
          </view>
          <view v-if="job.schedule.kind === 'at'" class="info-row">
            <text class="info-label">时间</text>
            <text class="info-value">{{ job.schedule.at }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">触发模式</text>
            <text class="info-value">{{ job.wakeMode === 'now' ? '立即' : '下次心跳' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">会话目标</text>
            <text class="info-value">{{ job.sessionTarget === 'main' ? '主会话' : '独立会话' }}</text>
          </view>
        </view>

        <!-- 消息内容 -->
        <view class="card">
          <text class="section-label">消息</text>
          <text class="payload-text" :selectable="true">{{ payloadText(job.payload) }}</text>
        </view>

        <!-- 运行状态 -->
        <view class="card">
          <text class="section-label">运行状态</text>
          <view v-if="job.state.nextRunAtMs && job.enabled" class="info-row">
            <text class="info-label">下次运行</text>
            <text class="info-value">{{ formatTime(job.state.nextRunAtMs) }}</text>
          </view>
          <view v-if="job.state.lastRunAtMs" class="info-row">
            <text class="info-label">上次运行</text>
            <text class="info-value">{{ formatTime(job.state.lastRunAtMs) }}</text>
          </view>
          <view v-if="job.state.lastRunStatus" class="info-row">
            <text class="info-label">上次结果</text>
            <text class="info-value" :class="job.state.lastRunStatus === 'ok' ? 'text-ok' : 'text-err'">
              {{ job.state.lastRunStatus }}
            </text>
          </view>
          <view v-if="job.state.lastDurationMs" class="info-row">
            <text class="info-label">耗时</text>
            <text class="info-value">{{ job.state.lastDurationMs }}ms</text>
          </view>
          <view v-if="job.state.lastError" class="info-row">
            <text class="info-label">错误</text>
            <text class="info-value text-err">{{ job.state.lastError }}</text>
          </view>
          <view v-if="job.state.runningAtMs" class="info-row">
            <text class="info-label">运行中</text>
            <text class="info-value text-ok">是</text>
          </view>
        </view>
      </scroll-view>

      <!-- 操作按钮 -->
      <view class="footer">
        <button class="btn-run" :disabled="running" @tap="onRun">
          {{ running ? '运行中...' : '立即运行' }}
        </button>
        <button class="btn-toggle" @tap="onToggle">
          {{ job.enabled ? '停用' : '启用' }}
        </button>
        <button class="btn-delete" @tap="onDelete">删除</button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { guardAuth } from '@/utils/guard'
import { cronList, cronRun, cronUpdate, cronRemove } from '@/api/cron'
import type { CronJob, CronSchedule, CronPayload } from '@/types/cron'
import { useTheme } from '@/composables/useTheme'

const { themeClass, theme } = useTheme()

const job = ref<CronJob | null>(null)
const loading = ref(false)
const running = ref(false)
const navTitle = ref('任务详情')
let jobId = ''

onLoad(async (options) => {
  if (!guardAuth()) return
  jobId = options?.id as string ?? ''
  if (!jobId) { uni.navigateBack(); return }
  await fetchJob()
})

async function fetchJob() {
  loading.value = true
  try {
    const result = await cronList({ includeDisabled: true })
    job.value = result.jobs.find(j => j.id === jobId) ?? null
    if (!job.value) throw new Error('not found')
    navTitle.value = job.value.name
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  } finally {
    loading.value = false
  }
}

async function onRun() {
  running.value = true
  try {
    await cronRun(jobId)
    uni.showToast({ title: '已触发', icon: 'success' })
    await fetchJob()
  } catch {
    uni.showToast({ title: '触发失败', icon: 'none' })
  } finally {
    running.value = false
  }
}

async function onToggle() {
  if (!job.value) return
  try {
    await cronUpdate(jobId, { enabled: !job.value.enabled })
    await fetchJob()
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function onDelete() {
  uni.showModal({
    title: '删除任务',
    content: `确认删除「${job.value?.name}」？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await cronRemove(jobId)
        uni.navigateBack()
      } catch {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },
  })
}

function scheduleKindLabel(kind: string): string {
  if (kind === 'cron') return 'Cron 表达式'
  if (kind === 'every') return '固定间隔'
  if (kind === 'at') return '指定时间'
  return kind
}

function formatEvery(ms: number): string {
  if (ms < 60000) return `${ms / 1000} 秒`
  if (ms < 3600000) return `${ms / 60000} 分钟`
  if (ms < 86400000) return `${ms / 3600000} 小时`
  return `${ms / 86400000} 天`
}

function payloadText(payload: CronPayload): string {
  if (payload.kind === 'systemEvent') return payload.text
  if (payload.kind === 'agentTurn') return payload.message
  return ''
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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
    .nav-back-icon { width: 44rpx; height: 44rpx; }
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
  .loading-text { font-size: 28rpx; color: var(--text-tertiary); }
}

.content { flex: 1; }

.card {
  background: var(--bg-card);
  border-radius: 20rpx;
  margin: 24rpx 24rpx 0;
  padding: 28rpx 32rpx;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.job-name {
  flex: 1;
  font-size: 34rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.job-status {
  flex-shrink: 0;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
  &.status-on { background: var(--accent-light); color: var(--accent); }
  &.status-off { background: var(--bg-tertiary); color: var(--text-tertiary); }
}

.job-desc {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.section-label {
  display: block;
  font-size: 24rpx;
  color: var(--text-tertiary);
  margin-bottom: 16rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10rpx 0;
  border-bottom: 1rpx solid var(--border-color);
  &:last-child { border-bottom: none; }
}

.info-label { font-size: 28rpx; color: var(--text-secondary); }
.info-value { font-size: 28rpx; color: var(--text-primary); max-width: 60%; text-align: right; }
.mono { font-family: monospace; }

.payload-text {
  font-size: 28rpx;
  color: var(--text-primary);
  line-height: 1.6;
}

.text-ok { color: #52c41a; }
.text-err { color: #ff4d4f; }

.footer {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: var(--bg-card);
  border-top: 1rpx solid var(--border-color);
}

.btn-run {
  flex: 2;
  height: 88rpx;
  background: var(--accent);
  color: #fff;
  border-radius: 16rpx;
  font-size: 28rpx;
  border: none;
  &[disabled] { opacity: 0.4; }
}

.btn-toggle {
  flex: 1;
  height: 88rpx;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-radius: 16rpx;
  font-size: 28rpx;
  border: none;
}

.btn-delete {
  flex: 1;
  height: 88rpx;
  background: transparent;
  color: var(--danger);
  border-radius: 16rpx;
  font-size: 28rpx;
  border: 1rpx solid var(--danger);
}
</style>
