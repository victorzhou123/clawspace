<template>
  <view class="login-container">
    <view class="login-content">
      <text class="title">ClawSpace</text>
      <text class="subtitle">OpenClaw AI Assistant</text>
      <view class="login-form">
        <text>登录页面 - 待开发</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const token = ref('')
</script>

<style scoped lang="scss">
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
}

.login-content {
  width: 80%;
  text-align: center;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.subtitle {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 60rpx;
}

.login-form {
  padding: 40rpx;
  background-color: #fff;
  border-radius: 20rpx;
}
</style>
