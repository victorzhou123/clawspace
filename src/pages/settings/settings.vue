<template>
  <view class="settings-page">
    <scroll-view scroll-y class="content">
      <!-- 用户信息卡片 -->
      <view class="card user-card">
        <view class="user-avatar">
          <text class="avatar-text">{{ userInitial }}</text>
        </view>
        <view class="user-info">
          <text class="user-name">{{ userName }}</text>
          <text class="user-status">已登录</text>
        </view>
      </view>

      <!-- 设置项 -->
      <view class="section">
        <view class="section-title">通用</view>
        <view class="item" @tap="clearCache">
          <text class="item-label">清除缓存</text>
          <text class="item-value">{{ cacheSize }}</text>
        </view>
        <view class="item" @tap="goTools">
          <text class="item-label">工具目录</text>
          <text class="arrow">›</text>
        </view>
      </view>

      <view class="section">
        <view class="section-title">关于</view>
        <view class="item">
          <text class="item-label">版本号</text>
          <text class="item-value">{{ version }}</text>
        </view>
        <view class="item" @tap="checkUpdate">
          <text class="item-label">检查更新</text>
          <text class="arrow">›</text>
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="logout-section">
        <button class="btn-logout" @tap="confirmLogout">退出登录</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { guardAuth } from '@/utils/guard'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const { instanceUrl } = storeToRefs(userStore)

const version = ref((() => {
  try { return uni.getSystemInfoSync().appVersion || '1.0.0' } catch { return '1.0.0' }
})())
const cacheSize = ref('0 KB')

const userName = computed(() => {
  if (instanceUrl.value) {
    try { return new URL(instanceUrl.value).hostname } catch { /* ignore */ }
    return instanceUrl.value
  }
  return '未知实例'
})
const userInitial = computed(() => userName.value.charAt(0).toUpperCase())

onLoad(() => { guardAuth() })

onShow(() => {
  calculateCacheSize()
})

function calculateCacheSize() {
  try {
    const info = uni.getStorageInfoSync()
    const keys = info.keys ?? []
    let totalSize = 0
    keys.forEach(key => {
      try {
        const data = uni.getStorageSync(key)
        if (data) totalSize += JSON.stringify(data).length
      } catch { /* ignore */ }
    })
    if (totalSize < 1024) {
      cacheSize.value = `${totalSize} B`
    } else if (totalSize < 1024 * 1024) {
      cacheSize.value = `${(totalSize / 1024).toFixed(1)} KB`
    } else {
      cacheSize.value = `${(totalSize / 1024 / 1024).toFixed(1)} MB`
    }
  } catch {
    cacheSize.value = '未知'
  }
}

function clearCache() {
  uni.showModal({
    title: '清除缓存',
    content: '将清除本地缓存数据（不包括登录信息），确认清除？',
    success: (res) => {
      if (res.confirm) {
        storage.remove('sessions')
        storage.remove('agents')
        storage.remove('chat')
        calculateCacheSize()
        uni.showToast({ title: '已清除', icon: 'success' })
      }
    },
  })
}

function goTools() {
  uni.navigateTo({ url: '/pages/tools/tools' })
}

function checkUpdate() {
  uni.showToast({ title: '已是最新版本', icon: 'none' })
}

function confirmLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确认退出当前账号？',
    success: async (res) => {
      if (res.confirm) {
        await userStore.logout()
        uni.reLaunch({ url: '/pages/auth/login' })
      }
    },
  })
}
</script>

<style scoped lang="scss">
.settings-page {
  height: 100vh;
  background: #f5f5f5;
}

.content {
  height: 100%;
}

.card {
  margin: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.user-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .avatar-text {
    font-size: 44rpx;
    color: #fff;
    font-weight: bold;
  }
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;

  .user-name {
    font-size: 32rpx;
    font-weight: 500;
    color: #1a1a1a;
  }

  .user-status {
    font-size: 26rpx;
    color: #52c41a;
  }
}

.section {
  margin: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;

  .section-title {
    padding: 24rpx 32rpx 16rpx;
    font-size: 26rpx;
    color: #999;
  }
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-top: 1rpx solid #f0f0f0;

  &:first-of-type {
    border-top: none;
  }

  &:active {
    background: #f5f5f5;
  }

  .item-label {
    font-size: 30rpx;
    color: #1a1a1a;
  }

  .item-value {
    font-size: 28rpx;
    color: #999;
  }

  .arrow {
    font-size: 40rpx;
    color: #ccc;
  }
}

.logout-section {
  margin: 48rpx 24rpx 24rpx;
}

.btn-logout {
  width: 100%;
  height: 88rpx;
  background: #fff;
  color: #ff4d4f;
  border-radius: 20rpx;
  font-size: 32rpx;
  border: none;

  &:active {
    opacity: 0.8;
  }
}
</style>
