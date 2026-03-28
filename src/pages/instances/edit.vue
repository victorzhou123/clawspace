<template>
  <view class="edit-instance-page" :class="themeClass">
    <view class="nav-bar">
      <view class="nav-back" @tap="() => { onVibrate(); uni.navigateBack(); }">
        <image class="nav-back-icon" :src="theme === 'dark' ? '/static/icon/back-light.svg' : '/static/icon/back-dark.svg'" mode="aspectFit" />
      </view>
      <text class="nav-title">编辑实例</text>
      <view style="width: 60rpx;" />
    </view>

    <view class="content">
      <view class="form">
        <view class="form-item">
          <text class="label">实例名称（可选）</text>
          <input
            v-model="form.name"
            class="input"
            placeholder="留空则使用 IP 地址"
            :maxlength="50"
          />
        </view>

        <view class="form-item">
          <text class="label">实例地址</text>
          <input
            v-model="form.url"
            class="input"
            placeholder="wss://192.168.1.1:18789"
            :maxlength="256"
          />
        </view>

        <view class="form-item">
          <text class="label">API Token</text>
          <input
            v-model="form.token"
            class="input"
            placeholder="输入 Token"
            :maxlength="512"
          />
        </view>

        <view class="btn-group">
          <button class="btn-action" :disabled="loading" @tap="handleSaveAndConnect">
            {{ loading ? '连接中...' : '保存并登录' }}
          </button>
          <button class="btn-action" :disabled="loading" @tap="handleSave">
            {{ loading ? '保存中...' : '保存' }}
          </button>
          <button class="btn-action btn-cancel" :disabled="loading" @tap="handleCancel">
            取消
          </button>
        </view>
      </view>

      <text v-if="errorMsg" class="error-msg">{{ errorMsg }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { guardAuth } from '@/utils/guard'
import { useInstanceStore } from '@/stores/instance'
import { useTheme } from '@/composables/useTheme'
import { onVibrate } from '@/utils/haptic'

const instanceStore = useInstanceStore()
const { themeClass, theme } = useTheme()

const loading = ref(false)
const errorMsg = ref('')
let instanceId = ''

const form = reactive({
  name: '',
  url: '',
  token: '',
})

const initialForm = reactive({
  name: '',
  url: '',
  token: '',
})

function extractHostFromUrl(url: string): string {
  try {
    const match = url.match(/^wss?:\/\/([^:/]+)/)
    return match ? match[1] : url
  } catch {
    return url
  }
}

function hasChanges(): boolean {
  return form.name.trim() !== initialForm.name ||
         form.url.trim() !== initialForm.url ||
         form.token.trim() !== initialForm.token
}

onLoad((options) => {
  guardAuth()
  if (options?.id) {
    instanceId = options.id as string
    loadInstance()
  }
})

function loadInstance() {
  instanceStore.loadInstances()
  const instance = instanceStore.instances.find(i => i.id === instanceId)
  if (instance) {
    form.name = instance.name
    form.url = instance.url
    form.token = instance.token
    initialForm.name = instance.name
    initialForm.url = instance.url
    initialForm.token = instance.token
  } else {
    uni.showToast({ title: '实例不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1000)
  }
}

function validateForm(): { name: string; url: string; token: string } | null {
  const name = form.name.trim()
  const url = form.url.trim()
  const token = form.token.trim()

  if (!url) {
    uni.showToast({ title: '请输入实例地址', icon: 'none' })
    return null
  }
  if (!/^wss?:\/\/.+/.test(url)) {
    uni.showToast({ title: '请输入完整地址（以 ws:// 或 wss:// 开头）', icon: 'none' })
    return null
  }
  if (!token) {
    uni.showToast({ title: '请输入 Token', icon: 'none' })
    return null
  }
  if (token.length < 16) {
    uni.showToast({ title: 'Token 格式无效（至少 16 字符）', icon: 'none' })
    return null
  }

  // 如果名称为空，使用 IP 地址作为默认名称
  const finalName = name || extractHostFromUrl(url)

  return { name: finalName, url, token }
}

async function handleSave() {
  const data = validateForm()
  if (!data) return

  loading.value = true
  errorMsg.value = ''

  try {
    const success = instanceStore.updateInstance(instanceId, data)
    if (success) {
      uni.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 500)
    } else {
      errorMsg.value = '保存失败'
    }
  } catch (e: any) {
    errorMsg.value = e?.message || '保存失败'
  } finally {
    loading.value = false
  }
}

async function handleSaveAndConnect() {
  const data = validateForm()
  if (!data) return

  loading.value = true
  errorMsg.value = ''

  try {
    const success = instanceStore.updateInstance(instanceId, data)
    if (!success) {
      errorMsg.value = '保存失败'
      return
    }
    await instanceStore.switchInstance(instanceId)
    uni.showToast({ title: '连接成功', icon: 'success' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/chat/chat' })
    }, 500)
  } catch (e: any) {
    errorMsg.value = e?.message || '连接失败'
    uni.showToast({ title: errorMsg.value, icon: 'none', duration: 2000 })
  } finally {
    loading.value = false
  }
}

function handleCancel() {
  if (hasChanges()) {
    uni.showModal({
      title: '提示',
      content: '是否放弃已编辑的内容？',
      success: (res) => {
        if (res.confirm) {
          uni.navigateBack()
        }
      }
    })
  } else {
    uni.navigateBack()
  }
}
</script>

<style scoped lang="scss">
.edit-instance-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.nav-bar {
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  padding-top: env(safe-area-inset-top);
  height: env(safe-area-inset-top);
  background: var(--nav-bg);
  border-bottom: 1rpx solid var(--nav-border);
  flex-shrink: 0;

  .nav-back {
    width: 60rpx;
    display: flex;
    align-items: center;
    .nav-back-icon { width: 66rpx; height: 66rpx; }
  }

  .nav-title {
    flex: 1;
    text-align: center;
    font-size: 32rpx;
    font-weight: 500;
    color: var(--nav-text);
  }
}

.content {
  flex: 1;
  padding: 40rpx;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;

  .label {
    font-size: 28rpx;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .input {
    height: 88rpx;
    border: 1rpx solid var(--border-color);
    border-radius: 12rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
    background: var(--bg-card);
    color: var(--text-primary);
  }
}

.btn-primary {
  height: 88rpx;
  background: var(--primary);
  color: #fff;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: 500;
  border: none;
  margin-top: 16rpx;

  &:active {
    opacity: 0.8;
  }

  &[disabled] {
    opacity: 0.6;
  }
}

.btn-group {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.btn-action {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: var(--bg-card);
  color: var(--text-primary);
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 500;
  text-align: center;
  border: 1rpx solid var(--border-color);

  &:active {
    opacity: 0.8;
  }

  &[disabled] {
    opacity: 0.6;
  }

  &:first-child,
  &:nth-child(2) {
    background: var(--bg-tertiary);
    color: #fff;
    border: none;
  }

  &.btn-cancel {
    background: rgba(255, 77, 79, 0.12);
    color: var(--danger);
    border: 1rpx solid rgba(255, 77, 79, 0.24);
  }
}

.error-msg {
  display: block;
  text-align: center;
  font-size: 26rpx;
  color: var(--danger);
  margin-top: 24rpx;
}
</style>
