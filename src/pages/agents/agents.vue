<template>
  <view class="agents-container">
    <view class="agents-header">
      <text class="title">Agent 管理</text>
    </view>
    <view class="agents-content">
      <text>Agent 管理页面 - 待开发</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { guardAuth } from '@/utils/guard'

onLoad(() => { guardAuth() })
</script>

<style scoped lang="scss">
.agents-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.agents-header {
  padding: 20rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;
}

.title {
  font-size: 32rpx;
  font-weight: bold;
}

.agents-content {
  flex: 1;
  padding: 20rpx;
}
</style>
