<template>
  <view class="files-page" :class="themeClass">
    <view class="nav-bar">
      <view class="nav-back" @tap="onBack">
        <image class="nav-back-icon" :src="theme === 'dark' ? '/static/icon/back-light.svg' : '/static/icon/back-dark.svg'" mode="aspectFit" />
      </view>
      <text class="nav-title">{{ navTitle }}</text>
      <view style="width: 60rpx;" />
    </view>
    <!-- 文件列表 -->
    <template v-if="!editingFile">
      <scroll-view scroll-y class="list" refresher-enabled :refresher-triggered="loading" @refresherrefresh="onRefresh">
        <view v-if="!loading && files.length === 0" class="empty">
          <text class="empty-text">暂无文件</text>
        </view>
        <view
          v-for="file in files"
          :key="file.name"
          class="file-item"
          @tap="openFile(file.name)"
        >
          <view class="file-info">
            <text class="file-name">{{ file.name }}</text>
            <text class="file-meta">{{ file.missing ? '未创建' : formatSize(file.size) }}</text>
          </view>
          <text class="arrow">›</text>
        </view>
      </scroll-view>
    </template>

    <!-- 文件编辑 -->
    <template v-else>
      <view v-if="loadingFile" class="loading-mask">
        <text class="loading-text">加载中...</text>
      </view>
      <template v-else>
        <scroll-view scroll-y class="editor-scroll">
          <textarea
            v-model="fileContent"
            class="editor"
            :placeholder="'编辑 ' + editingFile"
            :maxlength="200000"
            :auto-height="false"
          />
        </scroll-view>
        <view class="footer">
          <button class="btn-cancel" @tap="cancelEdit">取消</button>
          <button class="btn-save" :disabled="saving" @tap="saveFile">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </view>
      </template>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { guardAuth } from '@/utils/guard'
import { agentsFilesList, agentsFilesGet, agentsFilesSet } from '@/api/agents'
import type { AgentFileEntry } from '@/api/agents'
import { useTheme } from '@/composables/useTheme'

const { themeClass, theme } = useTheme()

const agentId = ref('')
const files = ref<AgentFileEntry[]>([])
const loading = ref(false)
const editingFile = ref<string | null>(null)
const fileContent = ref('')
const loadingFile = ref(false)
const saving = ref(false)
const navTitle = ref('Agent 文件')

onLoad(async (options) => {
  if (!guardAuth()) return
  agentId.value = options?.agentId as string ?? ''
  if (!agentId.value) { uni.navigateBack(); return }
  await fetchFiles()
})

async function fetchFiles() {
  loading.value = true
  try {
    const result = await agentsFilesList(agentId.value)
    files.value = result.files
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  await fetchFiles()
}

async function openFile(name: string) {
  editingFile.value = name
  navTitle.value = name
  loadingFile.value = true
  try {
    const result = await agentsFilesGet(agentId.value, name)
    fileContent.value = result.file.content ?? ''
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
    editingFile.value = null
    navTitle.value = 'Agent 文件'
  } finally {
    loadingFile.value = false
  }
}

function cancelEdit() {
  editingFile.value = null
  navTitle.value = 'Agent 文件'
}

async function saveFile() {
  if (!editingFile.value) return
  saving.value = true
  try {
    await agentsFilesSet(agentId.value, editingFile.value, fileContent.value)
    uni.showToast({ title: '保存成功', icon: 'success' })
    editingFile.value = null
    navTitle.value = 'Agent 文件'
    await fetchFiles()
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function onBack() {
  if (editingFile.value) {
    cancelEdit()
  } else {
    uni.navigateBack()
  }
}

function formatSize(size?: number): string {
  if (size == null) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}
</script>

<style scoped lang="scss">
.files-page {
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
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.list {
  flex: 1;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  .empty-text { font-size: 28rpx; color: var(--text-tertiary); }
}

.file-item {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-color);
  &:active { background: var(--bg-tertiary); }
}

.file-info {
  flex: 1;
  .file-name { display: block; font-size: 30rpx; color: var(--text-primary); margin-bottom: 6rpx; }
  .file-meta { display: block; font-size: 24rpx; color: var(--text-tertiary); }
}

.arrow { font-size: 40rpx; color: var(--text-tertiary); }

.editor-header {
  padding: 20rpx 32rpx;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-color);
  .editor-filename { font-size: 28rpx; color: var(--text-secondary); font-family: monospace; }
}

.loading-mask {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  .loading-text { font-size: 28rpx; color: var(--text-tertiary); }
}

.editor-scroll {
  flex: 1;
  background: var(--bg-card);
}

.editor {
  width: 100%;
  min-height: calc(100vh - 300rpx);
  padding: 24rpx 32rpx;
  font-size: 26rpx;
  font-family: monospace;
  line-height: 1.7;
  color: var(--text-primary);
  box-sizing: border-box;
}

.footer {
  display: flex;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: var(--bg-card);
  border-top: 1rpx solid var(--border-color);
}

.btn-cancel {
  flex: 1;
  height: 88rpx;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 16rpx;
  font-size: 32rpx;
  border: none;
}

.btn-save {
  flex: 2;
  height: 88rpx;
  background: var(--accent);
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
  border: none;
  &[disabled] { opacity: 0.4; }
}
</style>
