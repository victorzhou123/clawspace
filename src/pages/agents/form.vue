<template>
  <view class="form-page" :class="themeClass">
    <view class="nav-bar">
      <view class="nav-back" @tap="() => uni.navigateBack()">
        <image class="nav-back-icon" :src="theme === 'dark' ? '/static/icon/back-light.svg' : '/static/icon/back-dark.svg'" mode="aspectFit" />
      </view>
      <text class="nav-title">{{ navTitle }}</text>
      <view style="width: 60rpx;" />
    </view>
    <view v-if="loading" class="loading-mask">
      <text class="loading-text">加载中...</text>
    </view>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-body">
        <view class="field">
          <text class="label">名称 <text class="required">*</text></text>
          <input
            v-model="form.name"
            class="input"
            placeholder="Agent 名称"
            :maxlength="64"
          />
        </view>

        <view class="field">
          <text class="label">描述</text>
          <input
            v-model="form.description"
            class="input"
            placeholder="简短描述（可选）"
            :maxlength="256"
          />
        </view>

        <view class="field">
          <text class="label">模型</text>
          <picker
            :range="modelRange"
            :value="modelIndex"
            @change="onModelChange"
          >
            <view class="picker-row">
              <text class="picker-value">{{ form.model || '默认（不指定）' }}</text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>

        <view class="field">
          <text class="label">系统提示词</text>
          <textarea
            v-model="form.systemPrompt"
            class="textarea"
            placeholder="输入系统提示词（可选）"
            :maxlength="8000"
            :auto-height="true"
          />
        </view>
      </view>
    </scroll-view>

    <view class="footer">
      <button
        class="btn-save"
        :disabled="!form.name?.trim() || saving"
        @tap="onSave"
      >{{ saving ? '保存中...' : '保存' }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { guardAuth } from '@/utils/guard'
import { useAgentStore } from '@/stores/agent'
import { useModelStore } from '@/stores/model'
import { useTheme } from '@/composables/useTheme'

const agentStore = useAgentStore()
const modelStore = useModelStore()
const saving = ref(false)
const loading = ref(false)
const agentId = ref<string | null>(null)
const navTitle = ref('新建 Agent')
const { themeClass, theme } = useTheme()

const modelRange = computed(() => ['默认（不指定）', ...modelStore.models.map(m => m.id)])
const modelIndex = computed(() => {
  if (!form.model) return 0
  const idx = modelStore.models.findIndex(m => m.id === form.model)
  return idx >= 0 ? idx + 1 : 0
})

function onModelChange(e: any) {
  const idx = e.detail.value as number
  form.model = idx === 0 ? '' : modelStore.models[idx - 1].id
}

const form = reactive({
  name: '',
  description: '',
  model: '',
  systemPrompt: '',
})

onLoad(async (options) => {
  if (!guardAuth()) return
  modelStore.fetchModels().catch(() => {})
  if (options?.agentId) {
    agentId.value = options.agentId as string
    navTitle.value = '编辑 Agent'
    // 从 API 实时获取数据，避免 store 缓存丢失
    loading.value = true
    try {
      await agentStore.fetchAgents()
      const agent = agentStore.agents.find(a => a.id === agentId.value)
      if (!agent) throw new Error('not found')
      form.name = agent.name ?? ''
      form.description = agent.description ?? ''
      form.model = agent.model ?? ''
      form.systemPrompt = agent.systemPrompt ?? ''
    } catch {
      uni.showToast({ title: '加载失败', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1500)
    } finally {
      loading.value = false
    }
  } else {
    navTitle.value = '新建 Agent'
  }
})

async function onSave() {
  const name = form.name.trim()
  if (!name) {
    uni.showToast({ title: '请输入名称', icon: 'none' })
    return
  }
  if (name.length < 2) {
    uni.showToast({ title: '名称至少 2 个字符', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const data = {
      name,
      description: form.description.trim() || undefined,
      model: form.model.trim() || undefined,
      systemPrompt: form.systemPrompt.trim() || undefined,
    }

    if (agentId.value) {
      await agentStore.updateAgent(agentId.value, data)
    } else {
      await agentStore.createAgent(data)
    }

    uni.navigateBack()
    // 1 秒后重新获取 agent 列表
    setTimeout(() => {
      agentStore.fetchAgents().catch(() => {})
    }, 1000)
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.form-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  position: relative;
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
    .nav-back-icon { width: 44rpx; height: 44rpx; }
  }

  .nav-title {
    flex: 1;
    text-align: center;
    font-size: 32rpx;
    font-weight: 500;
    color: var(--nav-text);
  }
}

.loading-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-primary);
  opacity: 0.9;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;

  .loading-text {
    font-size: 28rpx;
    color: var(--text-tertiary);
  }
}

.form-scroll {
  flex: 1;
}

.form-body {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.field {
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 24rpx;

  .label {
    display: block;
    font-size: 26rpx;
    color: var(--text-secondary);
    margin-bottom: 16rpx;
  }

  .required {
    color: var(--danger);
  }
}

.input {
  width: 100%;
  height: 72rpx;
  font-size: 30rpx;
  color: var(--text-primary);
  border-bottom: 1rpx solid var(--border-color);
  padding-bottom: 8rpx;
}

.textarea {
  width: 100%;
  min-height: 160rpx;
  font-size: 30rpx;
  color: var(--text-primary);
  line-height: 1.6;
}

.picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 0;

  .picker-value {
    font-size: 30rpx;
    color: var(--text-primary);
    flex: 1;
  }

  .picker-arrow {
    font-size: 40rpx;
    color: var(--text-tertiary);
  }
}

.footer {
  padding: 24rpx 32rpx;
  background: var(--bg-card);
  border-top: 1rpx solid var(--border-color);
}

.btn-save {
  width: 100%;
  height: 88rpx;
  background: var(--accent);
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
  border: none;

  &[disabled] {
    opacity: 0.4;
  }
}
</style>
