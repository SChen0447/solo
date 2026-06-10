<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useCollectionStore } from '@/store/useCollection'
import type { EditionType, StatusType } from '@/数据类型/types'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useCollectionStore()

const formData = reactive({
  name: '',
  artist: '',
  year: 2024,
  edition: 'first' as EditionType,
  status: 'for_sale' as StatusType,
  coverImage: '',
  sellerPhone: '',
  story: ''
})

const isDragOver = ref(false)
const isSubmitting = ref(false)

const handleFileChange = (file: File) => {
  if (!file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = (e) => {
    formData.coverImage = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFileChange(file)
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleInputClick = () => {
  const input = document.getElementById('cover-input') as HTMLInputElement
  input?.click()
}

const handleInputChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) handleFileChange(file)
}

const resetForm = () => {
  formData.name = ''
  formData.artist = ''
  formData.year = 2024
  formData.edition = 'first'
  formData.status = 'for_sale'
  formData.coverImage = ''
  formData.sellerPhone = ''
  formData.story = ''
  isSubmitting.value = false
}

const handleSubmit = () => {
  if (!formData.name || !formData.artist || !formData.coverImage) return
  isSubmitting.value = true

  setTimeout(() => {
    store.addRecord({
      name: formData.name,
      artist: formData.artist,
      year: formData.year,
      edition: formData.edition,
      status: formData.status,
      coverImage: formData.coverImage,
      sellerPhone: formData.sellerPhone,
      story: formData.story
    })
    resetForm()
    emit('close')
  }, 300)
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal-container">
      <button class="close-btn" @click="handleClose">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>

      <h2 class="modal-title">发布新唱片</h2>

      <form @submit.prevent="handleSubmit" class="modal-form">
        <div
          class="upload-area"
          :class="{ 'drag-over': isDragOver }"
          @drop="handleDrop"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @click="handleInputClick"
        >
          <input
            id="cover-input"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleInputChange"
          />
          <div v-if="formData.coverImage" class="cover-preview">
            <img :src="formData.coverImage" alt="封面预览" />
          </div>
          <div v-else class="upload-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p>点击或拖拽上传封面图</p>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>唱片名称</label>
            <input
              v-model="formData.name"
              type="text"
              placeholder="请输入唱片名称"
              required
            />
          </div>
          <div class="form-group">
            <label>艺术家</label>
            <input
              v-model="formData.artist"
              type="text"
              placeholder="请输入艺术家名称"
              required
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>发行年份</label>
            <input
              v-model.number="formData.year"
              type="number"
              min="1900"
              max="2099"
            />
          </div>
          <div class="form-group">
            <label>版本类型</label>
            <select v-model="formData.edition">
              <option value="first">首版</option>
              <option value="reprint">再版</option>
              <option value="colored">彩胶</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>当前状态</label>
            <select v-model="formData.status">
              <option value="for_sale">在售</option>
              <option value="for_trade">可交换</option>
              <option value="show_only">仅供展示</option>
            </select>
          </div>
          <div class="form-group">
            <label>联系手机</label>
            <input
              v-model="formData.sellerPhone"
              type="tel"
              placeholder="请输入手机号"
            />
          </div>
        </div>

        <div class="form-group">
          <label>收藏故事</label>
          <textarea
            v-model="formData.story"
            rows="3"
            placeholder="分享一下这张唱片的故事..."
          ></textarea>
        </div>

        <button type="submit" class="submit-btn" :disabled="isSubmitting">
          {{ isSubmitting ? '提交中...' : '发布唱片' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-container {
  width: 560px;
  max-height: 90vh;
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  position: relative;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #5d4037;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 50%;
  transition: background 0.2s ease;
}

.close-btn:hover {
  background: #f5f0e8;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.modal-title {
  font-size: 22px;
  font-weight: 600;
  color: #3d2b1f;
  margin: 0 0 24px 0;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-area {
  width: 100%;
  height: 200px;
  border: 2px dashed #a1887f;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  background: #faf6f0;
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: #e76f51;
  background: #fff5f0;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #8d6e63;
}

.upload-placeholder svg {
  width: 48px;
  height: 48px;
}

.upload-placeholder p {
  margin: 0;
  font-size: 14px;
}

.cover-preview {
  width: 100%;
  height: 100%;
}

.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: #5d4037;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 14px;
  border: 1px solid #d7ccc8;
  border-radius: 8px;
  font-size: 14px;
  color: #3d2b1f;
  background: #fff;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #e76f51;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.submit-btn {
  margin-top: 8px;
  padding: 14px;
  background: linear-gradient(135deg, #e76f51, #d45d3a);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231, 111, 81, 0.3);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .modal-container {
    width: 90%;
    padding: 20px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
