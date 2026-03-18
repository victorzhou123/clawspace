<template>
  <view class="settings-container">
    <view class="settings-header">
      <text class="title">设置</text>
    </view>
    <view class="settings-content">
      <text>设置页面 - 待开发</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { guardAuth } from '@/utils/guard'

onLoad(() => { guardAuth() })
</script>

<style scoped lang="scss">
.settings-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.settings-header {
  padding: 20rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;
}

.title {
  font-size: 32rpx;
  font-weight: bold;
}

.settings-content {
  flex: 1;
  padding: 20rpx;
}
</style>
