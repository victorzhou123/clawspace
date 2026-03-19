<template>
  <view class="form-page">
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
          <ModelPicker v-model="form.model" placeholder="默认（不指定）" />
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
        :disabled="!form.name.trim() || saving"
        @tap="onSave"
      >{{ saving ? '保存中...' : '保存' }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { guardAuth } from '@/utils/guard'
import { useAgentStore } from '@/stores/agent'
import ModelPicker from '@/components/ModelPicker.vue'

const agentStore = useAgentStore()
const saving = ref(false)
const loading = ref(false)
const agentId = ref<string | null>(null)

const form = reactive({
  name: '',
  description: '',
  model: '',
  systemPrompt: '',
})

onLoad(async (options) => {
  if (!guardAuth()) return
  if (options?.agentId) {
    agentId.value = options.agentId as string
    uni.setNavigationBarTitle({ title: '编辑 Agent' })
    // 从 API 实时获取数据，避免 store 缓存丢失
    loading.value = true
    try {
      await agentStore.fetchAgents()
      const agent = agentStore.agents.find(a => a.id === agentId.value)
      if (!agent) throw new Error('not found')
      form.name = agent.name
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
    uni.setNavigationBarTitle({ title: '新建 Agent' })
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
  background: #f5f5f5;
  position: relative;
}

.loading-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;

  .loading-text {
    font-size: 28rpx;
    color: #999;
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
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;

  .label {
    display: block;
    font-size: 26rpx;
    color: #666;
    margin-bottom: 16rpx;
  }

  .required {
    color: #ff4d4f;
  }
}

.input {
  width: 100%;
  height: 72rpx;
  font-size: 30rpx;
  color: #1a1a1a;
  border-bottom: 1rpx solid #f0f0f0;
  padding-bottom: 8rpx;
}

.textarea {
  width: 100%;
  min-height: 160rpx;
  font-size: 30rpx;
  color: #1a1a1a;
  line-height: 1.6;
}

.footer {
  padding: 24rpx 32rpx;
  background: #fff;
  border-top: 1rpx solid #eee;
}

.btn-save {
  width: 100%;
  height: 88rpx;
  background: #007aff;
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
  border: none;

  &[disabled] {
    opacity: 0.4;
  }
}
</style>
