<template>
  <view class="login-page">
    <view class="login-header">
      <text class="app-name">ClawSpace</text>
      <text class="app-desc">OpenClaw AI Assistant</text>
    </view>

    <view class="login-body">
      <view class="form">
        <input
          v-model="form.url"
          class="input"
          placeholder="实例地址，如 http://192.168.1.1:18789"
          :maxlength="256"
        />
        <input
          v-model="form.token"
          class="input"
          placeholder="API Token"
          :maxlength="512"
        />
        <button class="btn-primary" :disabled="loading" @tap="handleLogin">
          {{ loading ? '连接中...' : '连接' }}
        </button>
      </view>

      <text v-if="errorMsg" class="error-msg">{{ errorMsg }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const loading = ref(false)
const errorMsg = ref('')
let redirectUrl = ''

onLoad((options) => {
  if (options?.redirect) {
    redirectUrl = decodeURIComponent(options.redirect as string)
  }
})

const form = reactive({
  url: userStore.instanceUrl ?? '',
  token: '',
})

async function handleLogin() {
  const url = form.url.trim()
  const token = form.token.trim()
  if (!url) {
    uni.showToast({ title: '请输入实例地址', icon: 'none' })
    return
  }
  if (!token) {
    uni.showToast({ title: '请输入 Token', icon: 'none' })
    return
  }
  if (token.length < 16) {
    uni.showToast({ title: 'Token 格式无效（至少 16 字符）', icon: 'none' })
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    await userStore.loginWithToken(url, token)
    if (redirectUrl) {
      uni.navigateTo({ url: redirectUrl })
    } else {
      uni.switchTab({ url: '/pages/chat/chat' })
    }
  } catch (e) {
    const msg = (e as Error).message ?? ''
    errorMsg.value = msg.includes('401') || msg.includes('unauthorized')
      ? '认证失败，请检查 Token'
      : msg.includes('timeout') || msg.includes('connect')
        ? '连接超时，请检查地址和网络'
        : '连接失败：' + msg
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  padding: 60rpx 40rpx;
}

.login-header {
  text-align: center;
  margin-bottom: 80rpx;

  .app-name {
    display: block;
    font-size: 56rpx;
    font-weight: bold;
    color: #007aff;
    margin-bottom: 16rpx;
  }

  .app-desc {
    display: block;
    font-size: 28rpx;
    color: #999;
  }
}

.login-body {
  width: 100%;
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.input {
  height: 88rpx;
  border: 1rpx solid #e5e5e5;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  background: #fafafa;
}

.btn-primary {
  height: 88rpx;
  background: #007aff;
  color: #fff;
  border-radius: 12rpx;
  font-size: 32rpx;
  border: none;
  margin-top: 8rpx;

  &[disabled] {
    opacity: 0.6;
  }
}

.error-msg {
  display: block;
  text-align: center;
  font-size: 26rpx;
  color: #dd524d;
  margin-top: 16rpx;
}
</style>
