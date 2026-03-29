<template>
  <view class="login-page" :class="themeClass" @touchmove.stop.prevent>
    <view class="login-header">
      <text class="app-name">clawspace</text>
      <text class="app-desc">你的openclaw助手面板</text>
    </view>

    <view class="login-body">
      <view class="form">
        <input
          v-model="form.url"
          class="input"
          placeholder="实例地址，如 wss://192.168.1.1:18789"
          :maxlength="256"
        />
        <view class="input-wrapper">
          <input
            v-model="form.token"
            :type="showToken ? 'text' : 'password'"
            class="input"
            placeholder="API Token"
            :maxlength="512"
          />
          <image
            class="eye-icon"
            :src="showToken ? (theme === 'dark' ? '/static/icon/eye-fill-light.svg' : '/static/icon/eye-fill-dark.svg') : (theme === 'dark' ? '/static/icon/eye-close-fill-light.svg' : '/static/icon/eye-close-fill-dark.svg')"
            mode="aspectFit"
            @tap="() => { onVibrate(); showToken = !showToken; }"
          />
        </view>
        <button class="btn-primary" :disabled="loading" @tap="handleLogin">
          {{ loading ? '连接中...' : '连 接' }}
        </button>
      </view>

      <text v-if="errorMsg" class="error-msg">{{ errorMsg }}</text>
    </view>

    <view class="tip-box">
      <view class="tip-header" @tap="toggleTip">
        <image class="tip-icon" :src="theme === 'dark' ? '/static/icon/info-light.svg' : '/static/icon/info-dark.svg'" mode="aspectFit" />
        <text class="tip-title">如何获取openclaw的实例信息</text>
        <image class="expand-icon" :class="{ expanded: tipExpanded }" :src="theme === 'dark' ? '/static/icon/expend-light.svg' : '/static/icon/expend-dark.svg'" mode="aspectFit" />
      </view>
      <view v-if="tipExpanded" class="tip-content">
        <text class="tip-text">请将以下文字发送到你的openclaw中：</text>
        <view class="copy-area">
          <text class="copy-text">我想要在我的app中连接此实例，把你的gateway url以及token发送给我</text>
          <view class="copy-btn" @tap="handleCopy">
            <image class="copy-icon" :src="theme === 'dark' ? '/static/icon/copy-fill-light.svg' : '/static/icon/copy-fill-dark.svg'" mode="aspectFit" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { useTheme } from '@/composables/useTheme'
import { onVibrate } from '@/utils/haptic'

const userStore = useUserStore()
const { themeClass, theme } = useTheme()

const loading = ref(false)
const errorMsg = ref('')
const tipExpanded = ref(false)
const showToken = ref(false)
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
  onVibrate()
  const url = form.url.trim()
  const token = form.token.trim()
  if (!url) {
    uni.showToast({ title: '请输入实例地址', icon: 'none' })
    return
  }
  if (!/^wss?:\/\/.+/.test(url)) {
    uni.showToast({ title: '请输入完整地址（以 ws:// 或 wss:// 开头）', icon: 'none' })
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
      uni.reLaunch({ url: '/pages/chat/chat' })
    }
  } catch (e) {
    const msg = (e as Error).message ?? ''
    errorMsg.value = msg.includes('401') || msg.includes('unauthorized')
      ? '认证失败，请检查 Token'
      : msg.includes('timeout') || msg.includes('connect')
        ? '连接超时，请检查地址和网络'
        : '连接失败，请检查地址和 Token'
  } finally {
    loading.value = false
  }
}

function toggleTip() {
  tipExpanded.value = !tipExpanded.value
}

function handleCopy() {
  const text = '我想要在我的app中连接此实例，把你的gateway url以及token发送给我'
  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({ title: '已复制', icon: 'success' })
    }
  })
}
</script>

<style scoped lang="scss">
.login-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--bg-primary);
  padding: 60rpx 40rpx;
  overflow: hidden;
}

.login-header {
  text-align: center;
  margin-top: 400rpx;
  margin-bottom: 80rpx;

  .app-name {
    display: block;
    font-size: 56rpx;
    font-weight: bold;
    color: var(--accent);
    margin-bottom: 16rpx;
  }

  .app-desc {
    display: block;
    font-size: 28rpx;
    color: var(--text-tertiary);
  }
}

.login-body {
  width: 80%;
  background: var(--bg-card);
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input {
  height: 88rpx;
  border: 1rpx solid var(--border-color);
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  background: var(--bg-primary);
  color: var(--text-primary);
  flex: 1;
}

.input-wrapper .input {
  padding-right: 80rpx;
}

.eye-icon {
  position: absolute;
  right: 24rpx;
  width: 40rpx;
  height: 40rpx;
  opacity: 0.6;
}

.btn-primary {
  height: 66rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
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
  color: var(--danger);
  margin-top: 16rpx;
}

.tip-box {
  width: 80%;
  margin-top: 54rpx;
  border-radius: 24rpx;
  overflow: hidden;
}

.tip-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 32rpx;
  cursor: pointer;

  &:active {
    opacity: 0.8;
  }
}

.theme-dark .tip-header {
  background: rgba(24, 144, 255, 0.15);
}

.theme-light .tip-header {
  background: rgba(24, 144, 255, 0.1);
}

.tip-icon {
  width: 48rpx;
  height: 48rpx;
  flex-shrink: 0;
}

.tip-title {
  flex: 1;
  font-size: 26rpx;
  color: var(--text-primary);
  font-weight: 500;
}

.expand-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  transition: transform 0.3s ease;

  &.expanded {
    transform: rotate(180deg);
  }
}

.tip-content {
  padding: 24rpx 32rpx;
  animation: slideDown 0.3s ease;
}

.theme-dark .tip-content {
  background: rgba(24, 144, 255, 0.1);
}

.theme-light .tip-content {
  background: rgba(24, 144, 255, 0.08);
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 500rpx;
  }
}

.tip-text {
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary);
  margin-bottom: 16rpx;
}

.copy-area {
  position: relative;
  padding: 20rpx;
  background: var(--bg-card);
  border-radius: 12rpx;
  border: 1rpx solid var(--border-color);
}

.copy-text {
  display: block;
  font-size: 26rpx;
  color: var(--text-primary);
  line-height: 1.6;
  padding-right: 60rpx;
}

.copy-btn {
  position: absolute;
  right: 12rpx;
  bottom: 12rpx;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 8rpx;

  &:active {
    opacity: 0.7;
  }
}

.copy-icon {
  width: 28rpx;
  height: 28rpx;
}
</style>
