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
        @scrolltoupper="onLoadMore"
      >
        <view class="message-list-inner">
          <!-- 加载更多 -->
          <view v-if="loadingMore" class="load-more-tip">
            <text>加载中...</text>
          </view>
          <view v-else-if="hasMore" class="load-more-tip">
            <text>下拉加载更多</text>
          </view>

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
            <MsgBubble
              :role="msg.role"
              :content="msg.content"
              :is-streaming="msg.isStreaming"
              :is-error="msg.status === 'error'"
            />
          </view>

          <!-- 底部锚点 -->
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
import { ref, watch, nextTick } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { guardAuth } from '@/utils/guard'
import { useSessionStore } from '@/stores/session'
import { useChatStore } from '@/stores/chat'
import MsgBubble from '@/components/MsgBubble.vue'

const sessionStore = useSessionStore()
const chatStore = useChatStore()
const { currentSessionId } = storeToRefs(sessionStore)
const { messages, sending, streaming, hasMore } = storeToRefs(chatStore)

const inputText = ref('')
const scrollAnchor = ref('msg-bottom')
const chatLoading = ref(false)
const loadingMore = ref(false)
let unsubscribeFn: (() => void) | null = null

onLoad(() => { guardAuth() })

onShow(async () => {
  const sessionId = sessionStore.currentSessionId
  if (!sessionId) return
  if (sessionId === chatStore.currentSessionId) return

  chatLoading.value = true
  chatStore.clearMessages()
  try {
    await chatStore.loadHistory(sessionId)
    unsubscribeFn?.()
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

// 流式更新时滚动跟随
watch(
  () => {
    const last = messages.value[messages.value.length - 1]
    return last?.isStreaming ? last.content : null
  },
  (val) => { if (val !== null) scrollToBottom() },
)

function scrollToBottom() {
  nextTick(() => {
    scrollAnchor.value = ''
    nextTick(() => { scrollAnchor.value = 'msg-bottom' })
  })
}

async function onLoadMore() {
  const sessionId = sessionStore.currentSessionId
  if (!sessionId || loadingMore.value || !hasMore.value) return
  // 记录加载前第一条消息 id，加载后定位回去
  const firstMsgId = messages.value[0]?.id
  loadingMore.value = true
  try {
    await chatStore.loadMore(sessionId)
    if (firstMsgId) {
      nextTick(() => {
        scrollAnchor.value = ''
        nextTick(() => { scrollAnchor.value = `msg-${firstMsgId}` })
      })
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loadingMore.value = false
  }
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
    color: #bbb;
  }
}

.load-more-tip {
  text-align: center;
  padding: 20rpx 0;
  font-size: 24rpx;
  color: #bbb;
}

.bubble-row {
  display: flex;
  margin-bottom: 24rpx;
}

.row-user {
  justify-content: flex-end;
}

.row-assistant {
  justify-content: flex-start;
}

.input-bar {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  background: #fff;
  border-top: 1rpx solid #eee;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
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
