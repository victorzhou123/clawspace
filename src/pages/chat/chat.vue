<template>
  <view class="chat-page">
    <!-- 无会话状态 -->
    <view v-if="!currentSessionId" class="no-session">
      <text class="no-session-text">请从「会话」标签选择一个会话</text>
    </view>

    <template v-else>
      <!-- 消息列表 -->
      <scroll-view
        class="message-list"
        scroll-y
        :scroll-into-view="scrollAnchor"
        scroll-with-animation
      >
        <view class="message-list-inner">
          <view v-if="messages.length === 0 && !chatLoading" class="empty-chat">
            <text class="empty-chat-text">发送消息开始对话</text>
          </view>

          <view
            v-for="msg in messages"
            :key="msg.id"
            :id="`msg-${msg.id}`"
            class="bubble-row"
            :class="msg.role === 'user' ? 'row-user' : 'row-assistant'"
          >
            <view
              class="bubble"
              :class="msg.role === 'user' ? 'bubble-user' : 'bubble-assistant'"
            >
              <text class="bubble-text" :selectable="true">{{ msg.content }}</text>
              <text v-if="msg.isStreaming" class="cursor">▋</text>
              <text v-if="msg.status === 'error'" class="error-tag">发送失败</text>
            </view>
          </view>

          <!-- 底部锚点，用于滚动到底部 -->
          <view id="msg-bottom" style="height: 1px;" />
        </view>
      </scroll-view>

      <!-- 输入区 -->
      <view class="input-bar">
        <textarea
          v-model="inputText"
          class="input"
          placeholder="输入消息..."
          :maxlength="4000"
          :auto-height="true"
          :disabled="sending"
          @confirm="onSend"
        />
        <button
          v-if="streaming"
          class="btn-action btn-abort"
          @tap="onAbort"
        >停止</button>
        <button
          v-else
          class="btn-action btn-send"
          :disabled="!inputText.trim() || sending"
          @tap="onSend"
        >发送</button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { guardAuth } from '@/utils/guard'
import { useSessionStore } from '@/stores/session'
import { useChatStore } from '@/stores/chat'

const sessionStore = useSessionStore()
const chatStore = useChatStore()
const { currentSessionId } = storeToRefs(sessionStore)
const { messages, sending, streaming } = storeToRefs(chatStore)

const inputText = ref('')
const scrollAnchor = ref('msg-bottom')
const chatLoading = ref(false)
let unsubscribeFn: (() => void) | null = null

onLoad(() => { guardAuth() })

onShow(async () => {
  const sessionId = sessionStore.currentSessionId
  if (!sessionId) return
  if (sessionId === chatStore.currentSessionId) return

  chatLoading.value = true
  chatStore.clearMessages()
  unsubscribeFn?.()
  try {
    await chatStore.loadHistory(sessionId)
    unsubscribeFn = chatStore.subscribeStream(sessionId)
    scrollToBottom()
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    chatLoading.value = false
  }
})

onUnload(() => {
  unsubscribeFn?.()
})

// 新消息时滚动到底部
watch(
  () => messages.value.length,
  () => scrollToBottom(),
)

function scrollToBottom() {
  scrollAnchor.value = ''
  setTimeout(() => { scrollAnchor.value = 'msg-bottom' }, 50)
}

async function onSend() {
  const content = inputText.value.trim()
  if (!content || sending.value) return
  const sessionId = sessionStore.currentSessionId
  if (!sessionId) return

  inputText.value = ''
  try {
    await chatStore.sendMessage(sessionId, content)
  } catch {
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

async function onAbort() {
  const sessionId = sessionStore.currentSessionId
  if (!sessionId) return
  await chatStore.abortMessage(sessionId).catch(() => {})
}
</script>

<style scoped lang="scss">
.chat-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.no-session {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;

  .no-session-text {
    font-size: 28rpx;
    color: #999;
  }
}

.message-list {
  flex: 1;
  overflow: hidden;
}

.message-list-inner {
  padding: 24rpx 24rpx 0;
}

.empty-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;

  .empty-chat-text {
    font-size: 28rpx;
    color: #ccc;
  }
}

.bubble-row {
  display: flex;
  margin-bottom: 24rpx;

  &.row-user {
    justify-content: flex-end;
  }

  &.row-assistant {
    justify-content: flex-start;
  }
}

.bubble {
  max-width: 72%;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  position: relative;

  &.bubble-user {
    background: #007aff;
    border-bottom-right-radius: 6rpx;
  }

  &.bubble-assistant {
    background: #fff;
    border-bottom-left-radius: 6rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  }
}

.bubble-text {
  font-size: 30rpx;
  line-height: 1.6;
  word-break: break-all;

  .bubble-user & {
    color: #fff;
  }

  .bubble-assistant & {
    color: #1a1a1a;
  }
}

.cursor {
  font-size: 30rpx;
  color: #007aff;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.error-tag {
  display: block;
  font-size: 22rpx;
  color: #ff4d4f;
  margin-top: 8rpx;
}

.input-bar {
  display: flex;
  align-items: flex-end;
  padding: 16rpx 24rpx;
  background: #fff;
  border-top: 1rpx solid #eee;
  gap: 16rpx;
}

.input {
  flex: 1;
  min-height: 72rpx;
  max-height: 200rpx;
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 16rpx 20rpx;
  font-size: 30rpx;
  line-height: 1.5;
}

.btn-action {
  flex-shrink: 0;
  width: 120rpx;
  height: 72rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  border: none;
  line-height: 72rpx;
  padding: 0;
}

.btn-send {
  background: #007aff;
  color: #fff;

  &[disabled] {
    opacity: 0.4;
  }
}

.btn-abort {
  background: #ff4d4f;
  color: #fff;
}
</style>
