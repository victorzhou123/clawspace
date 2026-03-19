<template>
  <view class="bubble" :class="isUser ? 'bubble-user' : 'bubble-assistant'">
    <!-- 用户消息：纯文本 -->
    <text v-if="isUser" class="bubble-text" :selectable="true">{{ content }}</text>

    <!-- assistant 消息：流式期间纯文本，完成后 markdown 渲染 -->
    <text v-else-if="isStreaming" class="bubble-text" :selectable="true">{{ content }}</text>
    <mp-html v-else :content="htmlContent" :selectable="true" />

    <text v-if="isStreaming" class="cursor">▋</text>
    <text v-if="isError" class="error-tag">发送失败</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import MpHtml from './mp-html/mp-html.vue'

const props = defineProps<{
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  isError?: boolean
}>()

const isUser = computed(() => props.role === 'user')

const htmlContent = computed(() => {
  if (isUser.value) return ''
  return marked.parse(props.content || '') as string
})
</script>

<style scoped lang="scss">
.bubble {
  max-width: 80%;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  word-break: break-word;
}

.bubble-user {
  background: #007aff;
  color: #fff;
  border-bottom-right-radius: 4rpx;
  align-self: flex-end;
}

.bubble-assistant {
  background: #fff;
  color: #1a1a1a;
  border-bottom-left-radius: 4rpx;
  align-self: flex-start;
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
</style>
