<script setup lang="ts">
import { ref } from 'vue'
import { usePaletteStore } from '@/stores/paletteStore'

const store = usePaletteStore()
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const errorMsg = ref('')

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg']

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    processFile(files[0])
  }
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    processFile(files[0])
  }
}

function processFile(file: File) {
  errorMsg.value = ''

  if (!ALLOWED_TYPES.includes(file.type)) {
    errorMsg.value = '请上传 JPG 或 PNG 格式的图片'
    return
  }

  if (file.size > MAX_SIZE) {
    errorMsg.value = '图片大小不能超过 5MB'
    return
  }

  store.extractColorsFromImage(file)
}

function triggerUpload() {
  fileInput.value?.click()
}
</script>

<template>
  <div class="upload-section">
    <div
      class="upload-area"
      :class="{ 'is-dragging': isDragging }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="triggerUpload"
    >
      <div v-if="store.isExtracting" class="extracting">
        <div class="spinner"></div>
        <p class="extracting-text">正在提取颜色...</p>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: store.extractionProgress + '%' }"></div>
        </div>
      </div>

      <div v-else-if="store.uploadedImage" class="preview-container">
        <img :src="store.uploadedImage" alt="上传的图片" class="preview-image" />
        <div class="preview-overlay">
          <span>点击重新上传</span>
        </div>
      </div>

      <div v-else class="upload-placeholder">
        <div class="upload-icon">🖼️</div>
        <p class="upload-text">拖拽图片到此处</p>
        <p class="upload-subtext">或点击选择文件</p>
        <p class="upload-hint">支持 JPG/PNG，最大 5MB</p>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        class="file-input"
        @change="handleFileSelect"
      />
    </div>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
  </div>
</template>

<style scoped>
.upload-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-area {
  position: relative;
  width: 100%;
  min-height: 200px;
  border: 2px dashed #ccc;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  background: white;
}

.upload-area:hover {
  border-color: #999;
}

.upload-area.is-dragging {
  border-style: solid;
  border-color: #4a90d9;
  background: #e8f4ff;
}

.upload-placeholder {
  text-align: center;
  padding: 24px;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.upload-text {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.upload-subtext {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 12px;
  color: #999;
}

.preview-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.preview-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.preview-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  color: white;
  font-size: 14px;
}

.preview-container:hover .preview-overlay {
  opacity: 1;
}

.extracting {
  text-align: center;
  padding: 24px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #4a90d9;
  border-radius: 50%;
  margin: 0 auto 12px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.extracting-text {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.progress-bar {
  width: 160px;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  margin: 0 auto;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a90d9, #5ba3e8);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.error-msg {
  font-size: 12px;
  color: #e74c3c;
  text-align: center;
}
</style>
