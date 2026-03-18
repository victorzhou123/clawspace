<template>
  <view class="sessions-container">
    <view class="sessions-header">
      <text class="title">会话列表</text>
    </view>
    <view class="sessions-content">
      <text>会话列表页面 - 待开发</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { guardAuth } from '@/utils/guard'

onLoad(() => { guardAuth() })
</script>

<style scoped lang="scss">
.sessions-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.sessions-header {
  padding: 20rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;
}

.title {
  font-size: 32rpx;
  font-weight: bold;
}

.sessions-content {
  flex: 1;
  padding: 20rpx;
}
</style>
