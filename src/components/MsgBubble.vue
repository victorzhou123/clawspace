<template>
  <view class="bubble" :class="bubbleClass">
    <!-- Loading 状态 -->
    <LoadingDots v-if="isLoading" />

    <!-- 用户消息：纯文本 -->
    <text v-else-if="isUser" class="bubble-text" :selectable="true">{{ textContent }}</text>

    <!-- 非 user / assistant 消息：整条默认折叠 -->
    <view v-else-if="isDirectlyCollapsible" class="collapsible">
      <view class="collapsible-header" @tap="toggleMessageCollapse">
        <text class="collapsible-icon">{{ messageCollapsed ? '▶' : '▼' }}</text>
        <text class="collapsible-title">{{ toolName || 'Tool Result' }}</text>
      </view>
      <view v-if="!messageCollapsed" class="collapsible-content">
        <view class="tool-result" :class="{ 'tool-result-error': isError }">
          <view class="code-block">
            <text class="code-text" :selectable="true">{{ textContent }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- assistant 消息 -->
    <view v-else>
      <!-- 复杂内容（数组） -->
      <view v-if="isComplexContent">
        <view v-for="(part, idx) in contentParts" :key="idx" class="content-part">
          <!-- thinking -->
          <view v-if="part.type === 'thinking'" class="collapsible">
            <view class="collapsible-header" @tap="toggleCollapse(idx)">
              <text class="collapsible-icon">{{ collapsed[idx] ? '▶' : '▼' }}</text>
              <text class="collapsible-title">思考过程</text>
            </view>
            <view v-if="!collapsed[idx]" class="collapsible-content">
              <text class="bubble-text" :selectable="true">{{ part.thinking }}</text>
            </view>
          </view>

          <!-- toolCall -->
          <view v-else-if="part.type === 'toolCall'" class="collapsible">
            <view class="collapsible-header" @tap="toggleCollapse(idx)">
              <text class="collapsible-icon">{{ collapsed[idx] ? '▶' : '▼' }}</text>
              <text class="collapsible-title">工具调用: {{ part.name }}</text>
            </view>
            <view v-if="!collapsed[idx]" class="collapsible-content">
              <view class="code-block">
                <text class="code-text" :selectable="true">{{ JSON.stringify(part.arguments, null, 2) }}</text>
              </view>
            </view>
          </view>

          <!-- text -->
          <view v-else-if="part.type === 'text'">
            <text v-if="isStreaming" class="bubble-text" :selectable="true">{{ part.text }}</text>
            <mp-html v-else :content="marked.parse(part.text || '')" :selectable="true" />
          </view>
        </view>
      </view>

      <!-- 简单内容（字符串） -->
      <view v-else>
        <text v-if="isStreaming" class="bubble-text" :selectable="true">{{ textContent }}</text>
        <mp-html v-else :content="htmlContent" :selectable="true" />
      </view>
    </view>

    <text v-if="isStreaming" class="cursor">▋</text>
    <text v-if="isError && role !== 'toolResult'" class="error-tag">发送失败</text>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { marked } from 'marked'
import MpHtml from './mp-html/mp-html.vue'
import LoadingDots from './LoadingDots.vue'
import type { ContentPart } from '@/types/chat'

const props = defineProps<{
  role: 'user' | 'assistant' | 'toolResult'
  content: string | ContentPart[]
  isStreaming?: boolean
  isLoading?: boolean
  isError?: boolean
  toolName?: string
}>()

const isUser = computed(() => props.role === 'user')
const isAssistant = computed(() => props.role === 'assistant')
const isDirectlyCollapsible = computed(() => !isUser.value && !isAssistant.value)
const isComplexContent = computed(() => Array.isArray(props.content))
const contentParts = computed(() => (Array.isArray(props.content) ? props.content : []))

const textContent = computed(() => {
  if (typeof props.content === 'string') return props.content
  if (Array.isArray(props.content)) {
    return props.content
      .filter((p: ContentPart) => p.type === 'text')
      .map((p: ContentPart) => (p as { text: string }).text)
      .join('\n')
  }
  return ''
})

const htmlContent = computed(() => {
  if (isUser.value) return ''
  return marked.parse(textContent.value || '') as string
})

const bubbleClass = computed(() => {
  if (props.role === 'toolResult') return 'bubble-tool'
  return isUser.value ? 'bubble-user' : 'bubble-assistant'
})

const messageCollapsed = ref(true)

// assistant 消息内部的折叠状态：仅折叠非 text 内容
const collapsed = ref<Record<number, boolean>>({})
contentParts.value.forEach((part, idx) => {
  if (isAssistant.value && part.type !== 'text') {
    collapsed.value[idx] = true
  }
})

function toggleMessageCollapse() {
  messageCollapsed.value = !messageCollapsed.value
}

function toggleCollapse(idx: number) {
  collapsed.value[idx] = !collapsed.value[idx]
}
</script>

<style scoped lang="scss">
.bubble {
  max-width: 80%;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  word-break: break-word;
}

.bubble-user {
  background: var(--bubble-user-bg, #1a4fa3);
  color: var(--bubble-user-text, #ffffff);
  border-bottom-right-radius: 4rpx;
  align-self: flex-end;
}

.bubble-assistant {
  background: var(--bubble-assistant-bg, #2c2c2e);
  color: var(--bubble-assistant-text, #e5e5e7);
  border-bottom-left-radius: 4rpx;
  align-self: flex-start;
}

.bubble-tool {
  background: var(--bubble-assistant-bg, #2c2c2e);
  color: var(--bubble-assistant-text, #e5e5e7);
  border-bottom-left-radius: 4rpx;
  align-self: flex-start;
  border-left: 4rpx solid #666;
}

.bubble-text {
  font-size: 30rpx;
  line-height: 1.6;
}

.cursor {
  font-size: 30rpx;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

.error-tag {
  display: block;
  font-size: 24rpx;
  color: #ff4d4f;
  margin-top: 8rpx;
}

.tool-result {
  width: 100%;
}

.tool-result-error {
  border-left-color: #ff4d4f;
}

.tool-result-header {
  margin-bottom: 8rpx;
}

.tool-result-title {
  font-size: 24rpx;
  color: #999;
  font-weight: 500;
}

.code-block {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8rpx;
  padding: 16rpx;
  overflow: auto;
}

.code-text {
  font-family: 'Courier New', monospace;
  font-size: 26rpx;
  line-height: 1.5;
  color: #e5e5e7;
}

.content-part {
  margin-bottom: 16rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.collapsible {
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 8rpx;
  overflow: hidden;
}

.collapsible-header {
  display: flex;
  align-items: center;
  padding: 12rpx 16rpx;
  background: rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.collapsible-icon {
  font-size: 24rpx;
  margin-right: 8rpx;
  color: #999;
}

.collapsible-title {
  font-size: 26rpx;
  color: #999;
  font-weight: 500;
}

.collapsible-content {
  padding: 16rpx;
}
</style>
