<template>
  <view class="instances-page" :class="themeClass">
    <view class="nav-bar">
      <view class="nav-back" @tap="() => { onVibrate(); uni.navigateBack(); }">
        <image class="nav-back-icon" :src="theme === 'dark' ? '/static/icon/back-light.svg' : '/static/icon/back-dark.svg'" mode="aspectFit" />
      </view>
      <text class="nav-title">实例管理</text>
      <view style="width: 60rpx;" />
    </view>

    <view v-if="instances.length === 0" class="empty-state">
      <text class="empty-text">暂无实例</text>
    </view>

    <scroll-view v-else scroll-y class="content">
      <view
        v-for="instance in instances"
        :key="instance.id"
        class="instance-item"
        :class="{ active: instance.id === currentInstanceId }"
      >
        <view class="instance-info">
          <text class="instance-name">{{ instance.name }}</text>
          <text class="instance-url">{{ instance.url }}</text>
          <text v-if="instance.id === currentInstanceId" class="instance-status">已连接</text>
        </view>
        <view class="instance-meta">
          <text class="instance-time">{{ formatTime(instance.lastLoginTime) }}</text>
        </view>
      </view>

      <view
        v-for="instance in instances"
        :key="instance.id + '_actions'"
        class="instance-actions-wrapper"
      >
        <view class="instance-actions">
          <view v-if="instance.id !== currentInstanceId" class="btn-action" @tap="switchTo(instance.id)">
            <text class="btn-text">连接</text>
          </view>
          <view class="btn-action" @tap="editInstance(instance.id)">
            <text class="btn-text">编辑</text>
          </view>
          <view v-if="instance.id !== currentInstanceId" class="btn-action btn-danger" @tap="confirmDelete(instance.id)">
            <text class="btn-text">删除</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="footer">
      <view class="btn-add" @tap="goToAdd">
        <image class="add-icon" :src="theme === 'dark' ? '/static/icon/add-light.svg' : '/static/icon/add-dark.svg'" mode="aspectFit" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { guardAuth } from '@/utils/guard'
import { useInstanceStore } from '@/stores/instance'
import { useTheme } from '@/composables/useTheme'
import { onVibrate } from '@/utils/haptic'

const instanceStore = useInstanceStore()
const { instances, currentInstanceId } = storeToRefs(instanceStore)
const { themeClass, theme } = useTheme()

onLoad(() => { guardAuth() })

onShow(() => {
  instanceStore.loadInstances()
})

function goToAdd() {
  uni.navigateTo({ url: '/pages/instances/add' })
}

function editInstance(id: string) {
  uni.navigateTo({ url: `/pages/instances/edit?id=${id}` })
}

async function switchTo(id: string) {
  uni.showLoading({ title: '切换中...' })
  try {
    await instanceStore.switchInstance(id)
    uni.hideLoading()
    uni.showToast({ title: '切换成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 500)
  } catch (e: any) {
    uni.hideLoading()
    const msg = e?.message || '切换失败'
    uni.showToast({ title: msg, icon: 'none', duration: 2000 })
  }
}

function confirmDelete(id: string) {
  uni.showModal({
    title: '删除实例',
    content: '确认删除该实例？',
    success: (res) => {
      if (res.confirm) {
        const success = instanceStore.deleteInstance(id)
        if (success) {
          uni.showToast({ title: '已删除', icon: 'success' })
        } else {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

function formatTime(timestamp: number): string {
  if (!timestamp) return ''

  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days === 1) return '昨天'

  const date = new Date(timestamp)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}
</script>

<style scoped lang="scss">
.instances-page {
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
  }
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 48rpx;

  .empty-text {
    font-size: 28rpx;
    color: var(--text-tertiary);
  }

  .btn-add-empty {
    padding: 24rpx 64rpx;
    background: var(--primary);
    border-radius: 16rpx;

    &:active {
      opacity: 0.8;
    }

    .btn-text {
      font-size: 30rpx;
      color: #fff;
    }
  }
}

.content {
  flex: 1;
  height: 0;
}

.instance-item {
  margin: 24rpx;
  padding: 32rpx;
  background: var(--bg-card);
  border-radius: 20rpx;
  border: 2rpx solid transparent;
  display: flex;
  align-items: flex-start;
  gap: 24rpx;

  &.active {
    border-color: var(--primary);
    background: var(--bg-card);
  }
}

.instance-info {
  flex: 1;
  min-width: 0;

  .instance-name {
    display: block;
    font-size: 32rpx;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8rpx;
  }

  .instance-url {
    display: block;
    font-size: 26rpx;
    color: var(--text-tertiary);
    margin-bottom: 8rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .instance-status {
    display: inline-block;
    font-size: 22rpx;
    color: var(--success);
    background: rgba(82, 196, 26, 0.1);
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
  }
}

.instance-meta {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;

  .instance-time {
    font-size: 24rpx;
    color: var(--text-tertiary);
  }
}

.instance-actions-wrapper {
  margin: 0 24rpx 24rpx;
}

.instance-actions {
  display: flex;
  gap: 16rpx;
}

.btn-action {
  flex: 1;
  padding: 20rpx;
  background: var(--bg-tertiary);
  border-radius: 12rpx;
  text-align: center;

  &:active {
    opacity: 0.7;
  }

  &.btn-danger {
    background: rgba(255, 77, 79, 0.1);

    .btn-text {
      color: var(--danger);
    }
  }

  .btn-text {
    font-size: 28rpx;
    color: var(--text-primary);
  }
}

.footer {
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: var(--bg-primary);
  border-top: 1rpx solid var(--border-color);
}

.btn-add {
  width: 100rpx;
  height: 100rpx;
  background: var(--bg-card);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;

  &:active {
    opacity: 0.8;
  }

  .add-icon {
    width: 48rpx;
    height: 48rpx;
  }
}
</style>
