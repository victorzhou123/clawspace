<template>
  <view class="cron-page">
    <scroll-view
      scroll-y
      class="list"
      refresher-enabled
      :refresher-triggered="loading"
      @refresherrefresh="onRefresh"
    >
      <view v-if="!loading && jobs.length === 0" class="empty">
        <text class="empty-text">暂无定时任务</text>
      </view>

      <view
        v-for="job in jobs"
        :key="job.id"
        class="job-item"
        @tap="goDetail(job.id)"
      >
        <view class="job-main">
          <view class="job-title-row">
            <text class="job-name">{{ job.name }}</text>
            <view class="job-status" :class="job.enabled ? 'status-on' : 'status-off'">
              <text>{{ job.enabled ? '启用' : '停用' }}</text>
            </view>
          </view>
          <text class="job-schedule">{{ formatSchedule(job.schedule) }}</text>
          <text v-if="job.state.lastRunAtMs" class="job-last-run">
            上次运行：{{ formatTime(job.state.lastRunAtMs) }}
            <text :class="job.state.lastRunStatus === 'ok' ? 'run-ok' : 'run-err'">
              {{ job.state.lastRunStatus === 'ok' ? ' ✓' : ' ✗' }}
            </text>
          </text>
          <text v-if="job.state.nextRunAtMs && job.enabled" class="job-next-run">
            下次运行：{{ formatTime(job.state.nextRunAtMs) }}
          </text>
        </view>
        <text class="arrow">›</text>
      </view>
    </scroll-view>

    <!-- 新建按钮 -->
    <view class="fab" @tap="goCreate">
      <text class="fab-text">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { guardAuth } from '@/utils/guard'
import { cronList } from '@/api/cron'
import type { CronJob, CronSchedule } from '@/types/cron'

const jobs = ref<CronJob[]>([])
const loading = ref(false)

onLoad(() => { guardAuth() })
onShow(async () => { await fetchJobs() })

async function fetchJobs() {
  loading.value = true
  try {
    const result = await cronList({ includeDisabled: true })
    jobs.value = result.jobs ?? []
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  await fetchJobs()
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/cron/detail?id=${id}` })
}

function goCreate() {
  uni.navigateTo({ url: '/pages/cron/form' })
}

function formatSchedule(schedule: CronSchedule): string {
  if (schedule.kind === 'cron') return `Cron: ${schedule.expr}`
  if (schedule.kind === 'every') {
    const ms = schedule.everyMs
    if (ms < 60000) return `每 ${ms / 1000} 秒`
    if (ms < 3600000) return `每 ${ms / 60000} 分钟`
    if (ms < 86400000) return `每 ${ms / 3600000} 小时`
    return `每 ${ms / 86400000} 天`
  }
  if (schedule.kind === 'at') return `定时: ${schedule.at}`
  return ''
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped lang="scss">
.cron-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  position: relative;
}

.list { flex: 1; }

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  .empty-text { font-size: 28rpx; color: #999; }
}

.job-item {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
  &:active { background: #f5f5f5; }
}

.job-main {
  flex: 1;
  overflow: hidden;
}

.job-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.job-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #1a1a1a;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.job-status {
  flex-shrink: 0;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;

  &.status-on { background: #e6f4ff; color: #007aff; }
  &.status-off { background: #f5f5f5; color: #999; }
}

.job-schedule {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 6rpx;
}

.job-last-run, .job-next-run {
  display: block;
  font-size: 24rpx;
  color: #bbb;
}

.run-ok { color: #52c41a; }
.run-err { color: #ff4d4f; }

.arrow { font-size: 40rpx; color: #ccc; margin-left: 16rpx; }

.fab {
  position: fixed;
  right: 48rpx;
  bottom: calc(48rpx + env(safe-area-inset-bottom));
  width: 100rpx;
  height: 100rpx;
  background: #007aff;
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
