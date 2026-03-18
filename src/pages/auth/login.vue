<template>
  <view class="login-page">
    <view class="login-header">
      <text class="app-name">ClawSpace</text>
      <text class="app-desc">OpenClaw AI Assistant</text>
    </view>

    <view class="login-body">
      <!-- 认证方式切换 -->
      <view class="tab-bar">
        <text
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @tap="activeTab = tab.key"
        >{{ tab.label }}</text>
      </view>

      <!-- Token 登录 -->
      <view v-if="activeTab === 'token'" class="form">
        <input
          v-model="tokenForm.token"
          class="input"
          placeholder="请输入 API Token"
          :maxlength="512"
        />
        <button class="btn-primary" :disabled="loading" @tap="handleTokenLogin">
          {{ loading ? '连接中...' : '连接' }}
        </button>
      </view>

      <!-- 密码登录 -->
      <view v-if="activeTab === 'password'" class="form">
        <input v-model="passwordForm.username" class="input" placeholder="用户名" :maxlength="128" />
        <input v-model="passwordForm.password" class="input" placeholder="密码" password :maxlength="128" />
        <button class="btn-primary" :disabled="loading" @tap="handlePasswordLogin">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </view>

      <!-- Device Token 登录 -->
      <view v-if="activeTab === 'device'" class="form">
        <input
          v-model="deviceForm.deviceToken"
          class="input"
          placeholder="请输入 Device Token"
          :maxlength="512"
        />
        <button class="btn-primary" :disabled="loading" @tap="handleDeviceLogin">
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
const activeTab = ref<'token' | 'password' | 'device'>('token')
let redirectUrl = ''

onLoad((options) => {
  if (options?.redirect) {
    redirectUrl = decodeURIComponent(options.redirect as string)
  }
})

const tabs = [
  { key: 'token' as const, label: 'Token' },
  { key: 'password' as const, label: '密码' },
  { key: 'device' as const, label: 'Device Token' },
]

const tokenForm = reactive({ token: '' })
const passwordForm = reactive({ username: '', password: '' })
const deviceForm = reactive({ deviceToken: '' })

async function handleTokenLogin() {
  if (!tokenForm.token.trim()) return
  await doLogin(() => userStore.loginWithToken(tokenForm.token.trim()))
}

async function handlePasswordLogin() {
  if (!passwordForm.username.trim() || !passwordForm.password) return
  await doLogin(() => userStore.loginWithPassword(passwordForm.username.trim(), passwordForm.password))
}

async function handleDeviceLogin() {
  if (!deviceForm.deviceToken.trim()) return
  await doLogin(() => userStore.loginWithDeviceToken(deviceForm.deviceToken.trim()))
}

async function doLogin(fn: () => Promise<void>) {
  loading.value = true
  errorMsg.value = ''
  try {
    await fn()
    if (redirectUrl) {
      uni.navigateTo({ url: redirectUrl })
    } else {
      uni.switchTab({ url: '/pages/chat/chat' })
    }
  } catch (e) {
    const msg = (e as Error).message ?? ''
    errorMsg.value = msg.includes('401') || msg.includes('unauthorized')
      ? '认证失败，请检查凭据'
      : msg.includes('timeout') || msg.includes('connect')
        ? '连接超时，请检查网络'
        : '连接失败，请检查配置'
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

.tab-bar {
  display: flex;
  border-bottom: 1rpx solid #eee;
  margin-bottom: 40rpx;

  .tab-item {
    flex: 1;
    text-align: center;
    padding: 20rpx 0;
    font-size: 28rpx;
    color: #999;

    &.active {
      color: #007aff;
      border-bottom: 4rpx solid #007aff;
      font-weight: 500;
    }
  }
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
