<template>
  <view class="tools-page" :class="themeClass">
    <view class="nav-bar">
      <view class="nav-back" @tap="() => uni.navigateBack()">
        <text class="nav-back-text">‹</text>
      </view>
      <text class="nav-title">工具目录</text>
      <view style="width: 60rpx;" />
    </view>
    <scroll-view
      scroll-y
      class="content"
      refresher-enabled
      :refresher-triggered="loading"
      @refresherrefresh="onRefresh"
    >
      <view v-if="!loading && groups.length === 0" class="empty">
        <text class="empty-text">暂无工具</text>
      </view>

      <view v-for="group in groups" :key="group.id" class="group">
        <view class="group-header">
          <text class="group-label">{{ group.label }}</text>
          <text v-if="group.source === 'plugin'" class="plugin-tag">插件</text>
        </view>

        <view
          v-for="tool in group.tools"
          :key="tool.id"
          class="tool-item"
        >
          <view class="tool-info">
            <text class="tool-name">{{ tool.label }}</text>
            <text class="tool-desc">{{ tool.description }}</text>
          </view>
          <text v-if="tool.source === 'plugin'" class="plugin-badge">插件</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { guardAuth } from '@/utils/guard'
import { useToolsStore } from '@/stores/tools'
import { useTheme } from '@/composables/useTheme'

const toolsStore = useToolsStore()
const { groups, loading } = storeToRefs(toolsStore)
const { themeClass } = useTheme()

onLoad(() => { guardAuth() })

onShow(async () => {
  await toolsStore.fetchCatalog().catch(() => {
    uni.showToast({ title: '加载失败', icon: 'none' })
  })
})

async function onRefresh() {
  await toolsStore.fetchCatalog().catch(() => {})
}
</script>

<style scoped lang="scss">
.tools-page {
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
    .nav-back-text { font-size: 44rpx; color: var(--accent); line-height: 1; margin-top: -2rpx; }
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

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;

  .empty-text {
    font-size: 28rpx;
    color: var(--text-tertiary);
  }
}

.group {
  margin: 24rpx 24rpx 0;
  background: var(--bg-card);
  border-radius: 20rpx;
  overflow: hidden;

  &:last-child {
    margin-bottom: 24rpx;
  }
}

.group-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 32rpx 16rpx;
  border-bottom: 1rpx solid var(--border-color);

  .group-label {
    font-size: 26rpx;
    color: var(--text-tertiary);
    font-weight: 500;
  }
}

.plugin-tag {
  font-size: 20rpx;
  color: #fa8c16;
  background: rgba(250, 140, 22, 0.1);
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.tool-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid var(--border-color);

  &:last-child {
    border-bottom: none;
  }
}

.tool-info {
  flex: 1;

  .tool-name {
    display: block;
    font-size: 30rpx;
    color: var(--text-primary);
    margin-bottom: 6rpx;
  }

  .tool-desc {
    display: block;
    font-size: 24rpx;
    color: var(--text-tertiary);
    line-height: 1.5;
  }
}

.plugin-badge {
  font-size: 20rpx;
  color: #fa8c16;
  background: rgba(250, 140, 22, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
  margin-left: 16rpx;
}
</style>
