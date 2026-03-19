<template>
  <view class="files-page">
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
      <view class="editor-header">
        <text class="editor-filename">{{ editingFile }}</text>
      </view>
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

const agentId = ref('')
const files = ref<AgentFileEntry[]>([])
const loading = ref(false)
const editingFile = ref<string | null>(null)
const fileContent = ref('')
const loadingFile = ref(false)
const saving = ref(false)

onLoad(async (options) => {
  if (!guardAuth()) return
  agentId.value = options?.agentId as string ?? ''
  if (!agentId.value) { uni.navigateBack(); return }
  uni.setNavigationBarTitle({ title: 'Agent 文件' })
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
  loadingFile.value = true
  fileContent.value = ''
  uni.setNavigationBarTitle({ title: name })
  try {
    const result = await agentsFilesGet(agentId.value, name)
    fileContent.value = result.file.content ?? ''
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
    editingFile.value = null
    uni.setNavigationBarTitle({ title: 'Agent 文件' })
  } finally {
    loadingFile.value = false
  }
}

function cancelEdit() {
  editingFile.value = null
  uni.setNavigationBarTitle({ title: 'Agent 文件' })
}

async function saveFile() {
  if (!editingFile.value) return
  saving.value = true
  try {
    await agentsFilesSet(agentId.value, editingFile.value, fileContent.value)
    uni.showToast({ title: '保存成功', icon: 'success' })
    editingFile.value = null
    uni.setNavigationBarTitle({ title: 'Agent 文件' })
    await fetchFiles()
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
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
  background: #f5f5f5;
}

.list {
  flex: 1;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  .empty-text { font-size: 28rpx; color: #999; }
}

.file-item {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
  &:active { background: #f5f5f5; }
}

.file-info {
  flex: 1;
  .file-name { display: block; font-size: 30rpx; color: #1a1a1a; margin-bottom: 6rpx; }
  .file-meta { display: block; font-size: 24rpx; color: #bbb; }
}

.arrow { font-size: 40rpx; color: #ccc; }

.editor-header {
  padding: 20rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;
  .editor-filename { font-size: 28rpx; color: #666; font-family: monospace; }
}

.loading-mask {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  .loading-text { font-size: 28rpx; color: #999; }
}

.editor-scroll {
  flex: 1;
  background: #fff;
}

.editor {
  width: 100%;
  min-height: calc(100vh - 300rpx);
  padding: 24rpx 32rpx;
  font-size: 26rpx;
  font-family: monospace;
  line-height: 1.7;
  color: #1a1a1a;
  box-sizing: border-box;
}

.footer {
  display: flex;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #eee;
}

.btn-cancel {
  flex: 1;
  height: 88rpx;
  background: #f5f5f5;
  color: #666;
  border-radius: 16rpx;
  font-size: 32rpx;
  border: none;
}

.btn-save {
  flex: 2;
  height: 88rpx;
  background: #007aff;
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
  border: none;
  &[disabled] { opacity: 0.4; }
}
</style>
