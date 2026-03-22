<template>
  <view class="form-page" :class="themeClass">
    <view class="nav-bar">
      <view class="nav-back" @tap="() => uni.navigateBack()">
        <image class="nav-back-icon" :src="theme === 'dark' ? '/static/icon/back-light.svg' : '/static/icon/back-dark.svg'" mode="aspectFit" />
      </view>
      <text class="nav-title">新建任务</text>
      <view style="width: 60rpx;" />
    </view>
    <scroll-view scroll-y class="form-scroll">
      <view class="form-body">

        <!-- 名称 -->
        <view class="field">
          <text class="label">名称 <text class="required">*</text></text>
          <input v-model="form.name" class="input" placeholder="任务名称" :maxlength="64" />
        </view>

        <!-- 描述 -->
        <view class="field">
          <text class="label">描述</text>
          <input v-model="form.description" class="input" placeholder="可选" :maxlength="256" />
        </view>

        <!-- 调度类型 -->
        <view class="field">
          <text class="label">调度类型</text>
          <view class="seg">
            <text
              v-for="opt in scheduleKinds"
              :key="opt.value"
              class="seg-item"
              :class="form.scheduleKind === opt.value ? 'seg-active' : ''"
              @tap="form.scheduleKind = opt.value"
            >{{ opt.label }}</text>
          </view>
        </view>

        <!-- Cron 表达式 -->
        <view v-if="form.scheduleKind === 'cron'" class="field">
          <text class="label">Cron 表达式 <text class="required">*</text></text>
          <input v-model="form.cronExpr" class="input mono" placeholder="如 0 9 * * *" :maxlength="128" />
        </view>

        <!-- 固定间隔 -->
        <view v-if="form.scheduleKind === 'every'" class="field">
          <text class="label">间隔（分钟）<text class="required">*</text></text>
          <input v-model="form.everyMinutes" class="input" type="number" placeholder="如 30" />
        </view>

        <!-- 消息内容 -->
        <view class="field">
          <text class="label">消息内容 <text class="required">*</text></text>
          <textarea
            v-model="form.message"
            class="textarea"
            placeholder="发送给 Agent 的消息"
            :maxlength="4000"
            :auto-height="true"
          />
        </view>

        <!-- 会话目标 -->
        <view class="field">
          <text class="label">会话目标</text>
          <view class="seg">
            <text
              class="seg-item"
              :class="form.sessionTarget === 'main' ? 'seg-active' : ''"
              @tap="form.sessionTarget = 'main'"
            >主会话</text>
            <text
              class="seg-item"
              :class="form.sessionTarget === 'isolated' ? 'seg-active' : ''"
              @tap="form.sessionTarget = 'isolated'"
            >独立会话</text>
          </view>
        </view>

        <!-- 触发模式 -->
        <view class="field">
          <text class="label">触发模式</text>
          <view class="seg">
            <text
              class="seg-item"
              :class="form.wakeMode === 'next-heartbeat' ? 'seg-active' : ''"
              @tap="form.wakeMode = 'next-heartbeat'"
            >下次心跳</text>
            <text
              class="seg-item"
              :class="form.wakeMode === 'now' ? 'seg-active' : ''"
              @tap="form.wakeMode = 'now'"
            >立即</text>
          </view>
        </view>

      </view>
    </scroll-view>

    <view class="footer">
      <button class="btn-save" :disabled="!canSave || saving" @tap="onSave">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { guardAuth } from '@/utils/guard'
import { cronAdd } from '@/api/cron'
import type { CronSessionTarget, CronWakeMode } from '@/types/cron'
import { useTheme } from '@/composables/useTheme'

const { themeClass, theme } = useTheme()

onLoad(() => { guardAuth() })

const saving = ref(false)

const scheduleKinds = [
  { label: 'Cron', value: 'cron' },
  { label: '固定间隔', value: 'every' },
]

const form = reactive({
  name: '',
  description: '',
  scheduleKind: 'cron' as 'cron' | 'every',
  cronExpr: '',
  everyMinutes: '',
  message: '',
  sessionTarget: 'main' as CronSessionTarget,
  wakeMode: 'next-heartbeat' as CronWakeMode,
})

const canSave = computed(() => {
  if (!form.name.trim() || !form.message.trim()) return false
  if (form.scheduleKind === 'cron' && !form.cronExpr.trim()) return false
  if (form.scheduleKind === 'every' && !form.everyMinutes) return false
  return true
})

async function onSave() {
  saving.value = true
  try {
    const schedule = form.scheduleKind === 'cron'
      ? { kind: 'cron' as const, expr: form.cronExpr.trim() }
      : { kind: 'every' as const, everyMs: Number(form.everyMinutes) * 60000 }

    await cronAdd({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      enabled: true,
      schedule,
      sessionTarget: form.sessionTarget,
      wakeMode: form.wakeMode,
      payload: { kind: 'agentTurn', message: form.message.trim() },
    })
    uni.showToast({ title: '创建成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  } catch {
    uni.showToast({ title: '创建失败', icon: 'none' })
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

.form-scroll { flex: 1; }

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

  .required { color: var(--danger); }
}

.input {
  width: 100%;
  height: 72rpx;
  font-size: 30rpx;
  color: var(--text-primary);
  border-bottom: 1rpx solid var(--border-color);
  padding-bottom: 8rpx;

  &.mono { font-family: monospace; }
}

.textarea {
  width: 100%;
  min-height: 120rpx;
  font-size: 30rpx;
  color: var(--text-primary);
  line-height: 1.6;
}

.seg {
  display: flex;
  gap: 16rpx;
}

.seg-item {
  flex: 1;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  font-size: 28rpx;
  border-radius: 12rpx;
  background: var(--bg-tertiary);
  color: var(--text-secondary);

  &.seg-active {
    background: var(--accent-light);
    color: var(--accent);
    font-weight: 500;
  }
}

.footer {
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
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

  &[disabled] { opacity: 0.4; }
}
</style>
