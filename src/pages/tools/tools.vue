<template>
  <view class="tools-page">
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

const toolsStore = useToolsStore()
const { groups, loading } = storeToRefs(toolsStore)

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
  background: #f5f5f5;
}

.content {
  height: 100%;
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

.group {
  margin: 24rpx 24rpx 0;
  background: #fff;
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
  border-bottom: 1rpx solid #f0f0f0;

  .group-label {
    font-size: 26rpx;
    color: #999;
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
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.tool-info {
  flex: 1;

  .tool-name {
    display: block;
    font-size: 30rpx;
    color: #1a1a1a;
    margin-bottom: 6rpx;
  }

  .tool-desc {
    display: block;
    font-size: 24rpx;
    color: #999;
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
