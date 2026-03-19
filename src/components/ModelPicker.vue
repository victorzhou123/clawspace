<template>
  <view class="model-picker">
    <view class="picker-trigger" @tap="open">
      <text class="picker-value">{{ modelValue || placeholder }}</text>
      <text class="picker-arrow">›</text>
    </view>

    <!-- 弹出层 -->
    <uni-popup ref="popup" type="bottom">
      <view class="popup-content">
        <view class="popup-header">
          <text class="popup-title">选择模型</text>
          <text class="popup-close" @tap="close">关闭</text>
        </view>

        <view v-if="loading" class="popup-loading">
          <text>加载中...</text>
        </view>

        <scroll-view v-else scroll-y class="model-list">
          <!-- 清空选项 -->
          <view class="model-item" @tap="select('')">
            <text class="model-name" :class="{ selected: !modelValue }">默认（不指定）</text>
            <text v-if="!modelValue" class="check">✓</text>
          </view>

          <view
            v-for="model in models"
            :key="model.id"
            class="model-item"
            @tap="select(model.id)"
          >
            <view class="model-info">
              <text class="model-name" :class="{ selected: modelValue === model.id }">{{ model.id }}</text>
              <text v-if="model.label && model.label !== model.id" class="model-label">{{ model.label }}</text>
            </view>
            <text v-if="modelValue === model.id" class="check">✓</text>
          </view>
        </scroll-view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useModelStore } from '@/stores/model'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const modelStore = useModelStore()
const { models, loading } = storeToRefs(modelStore)
const popup = ref()

onMounted(() => {
  modelStore.fetchModels().catch(() => {})
})

function open() {
  popup.value?.open()
}

function close() {
  popup.value?.close()
}

function select(id: string) {
  emit('update:modelValue', id)
  close()
}
</script>

<style scoped lang="scss">
.model-picker {
  width: 100%;
}

.picker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 0;

  .picker-value {
    font-size: 30rpx;
    color: #1a1a1a;
    flex: 1;
  }

  .picker-arrow {
    font-size: 40rpx;
    color: #ccc;
  }
}

.popup-content {
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;

  .popup-title {
    font-size: 32rpx;
    font-weight: 500;
    color: #1a1a1a;
  }

  .popup-close {
    font-size: 28rpx;
    color: #007aff;
  }
}

.popup-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx;
  font-size: 28rpx;
  color: #999;
}

.model-list {
  max-height: 60vh;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: #f5f5f5;
  }
}

.model-info {
  flex: 1;
}

.model-name {
  font-size: 30rpx;
  color: #1a1a1a;

  &.selected {
    color: #007aff;
    font-weight: 500;
  }
}

.model-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
}

.check {
  font-size: 32rpx;
  color: #007aff;
  flex-shrink: 0;
  margin-left: 16rpx;
}
</style>
