<template>
  <view class="chat-container">
    <view class="chat-header">
      <text class="title">聊天</text>
    </view>
    <view class="chat-content">
      <text>聊天页面 - 待开发</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const messages = ref([])
</script>

<style scoped lang="scss">
.chat-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.chat-header {
  padding: 20rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;
}

.title {
  font-size: 32rpx;
  font-weight: bold;
}

.chat-content {
  flex: 1;
  padding: 20rpx;
}
</style>
