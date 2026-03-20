<template>
  <view class="chat-page" :class="themeClass">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-left" @tap="openDrawer">
        <view class="hamburger">
          <view class="bar" />
          <view class="bar" />
          <view class="bar" />
        </view>
      </view>
      <view class="nav-center">
        <text class="nav-title">{{ currentSessionTitle || 'ClawSpace' }}</text>
        <text v-if="streaming" class="nav-typing">{{ typingText }}</text>
      </view>
      <view class="nav-right" />
    </view>

    <!-- 抽屉 -->
    <DrawerMenu :visible="drawerOpen" @close="drawerOpen = false" />

    <!-- 无会话状态 -->
    <view v-if="!currentSessionId" class="no-session">
      <text class="no-session-text">点击左上角菜单选择会话</text>
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
        <button v-if="streaming" class="btn-action btn-abort" @tap="onAbort">停止</button>
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
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { guardAuth } from '@/utils/guard'
import { useSessionStore } from '@/stores/session'
import { useChatStore } from '@/stores/chat'
import MsgBubble from '@/components/MsgBubble.vue'
import DrawerMenu from '@/components/DrawerMenu.vue'
import { useTheme } from '@/composables/useTheme'

const sessionStore = useSessionStore()
const chatStore = useChatStore()
const { currentSessionId, sessions } = storeToRefs(sessionStore)
const { messages, sending, streaming, hasMore } = storeToRefs(chatStore)

const { themeClass } = useTheme()

const inputText = ref('')
const scrollAnchor = ref('msg-bottom')
const chatLoading = ref(false)
const loadingMore = ref(false)
const drawerOpen = ref(false)
let unsubscribeFn: (() => void) | null = null

// 正在思考动画
const typingText = ref('')
let typingTimer: ReturnType<typeof setInterval> | null = null
const TYPING_FRAMES = ['正在思考.', '正在思考..', '正在思考...']

function startTyping() {
  if (typingTimer) return
  let i = 0
  typingText.value = TYPING_FRAMES[0]
  typingTimer = setInterval(() => {
    i = (i + 1) % TYPING_FRAMES.length
    typingText.value = TYPING_FRAMES[i]
  }, 500)
}

function stopTyping() {
  if (typingTimer) {
    clearInterval(typingTimer)
    typingTimer = null
  }
  typingText.value = ''
}

// sending 变为 true 时立即启动，sending 和 streaming 都为 false 时停止
watch(
  () => sending.value || streaming.value,
  (active) => { active ? startTyping() : stopTyping() }
)

onUnmounted(() => { stopTyping() })

const currentSessionTitle = computed(() => {
  if (!currentSessionId.value) return ''
  const s = sessions.value.find(s => s.key === currentSessionId.value)
  return s?.key || s?.label || s?.derivedTitle || s?.displayName || currentSessionId.value
})

onLoad(() => { guardAuth() })

onShow(async () => {
  // 初次加载会话列表（抽屉需要）
  if (sessionStore.sessions.length === 0) {
    await sessionStore.fetchSessions().catch(() => {})
  }

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

// 切换会话时重新加载
watch(currentSessionId, async (sessionId) => {
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

onUnload(() => { unsubscribeFn?.() })

watch(() => messages.value.length, (len) => { if (len > 0) scrollToBottom() })

let scrollTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => {
    const last = messages.value[messages.value.length - 1]
    return last?.isStreaming ? last.content : null
  },
  (val) => {
    if (val === null) return
    if (scrollTimer) return
    scrollTimer = setTimeout(() => {
      scrollTimer = null
      scrollToBottom()
    }, 200)
  },
)

function scrollToBottom() {
  if (!currentSessionId.value) return
  nextTick(() => {
    scrollAnchor.value = ''
    nextTick(() => { scrollAnchor.value = 'msg-bottom' })
  })
}

function openDrawer() {
  drawerOpen.value = true
}

async function onLoadMore() {
  const sessionId = sessionStore.currentSessionId
  if (!sessionId || loadingMore.value || !hasMore.value) return
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
  await nextTick()
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
  background-color: var(--bg-primary);
}

.nav-bar {
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  padding-top: env(safe-area-inset-top);
  height: calc(88rpx + env(safe-area-inset-top));
  background: var(--nav-bg);
  border-bottom: 1rpx solid var(--nav-border);
  flex-shrink: 0;
}

.nav-left, .nav-right {
  width: 80rpx;
  display: flex;
  align-items: center;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 500;
  color: var(--nav-text);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.hamburger {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 8rpx;

  .bar {
    width: 44rpx;
    height: 4rpx;
    background: var(--nav-text);
    border-radius: 2rpx;
  }
}

.no-session {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;

  .no-session-text { font-size: 28rpx; color: var(--text-tertiary); }
}

.message-list { flex: 1; min-height: 0; }
.message-list-inner { padding: 16rpx 0 8rpx; }

.load-more-tip {
  text-align: center;
  padding: 16rpx;
  font-size: 24rpx;
  color: var(--text-tertiary);
}

.empty-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
  .empty-chat-text { font-size: 28rpx; color: var(--text-tertiary); }
}

.bubble-row {
  display: flex;
  padding: 8rpx 24rpx;
  &.row-user { justify-content: flex-end; }
  &.row-assistant { justify-content: flex-start; }
}

.input-bar {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: var(--nav-bg);
  border-top: 1rpx solid var(--nav-border);
  flex-shrink: 0;
}

.input {
  flex: 1;
  min-height: 72rpx;
  max-height: 200rpx;
  background: var(--input-bg);
  border-radius: 16rpx;
  padding: 16rpx 20rpx;
  font-size: 30rpx;
  line-height: 1.5;
  color: var(--input-text);
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
  background: var(--accent);
  color: #fff;
  &[disabled] { opacity: 0.4; }
}

.btn-abort {
  background: var(--danger);
  color: #fff;
}
</style>
