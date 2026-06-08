<script setup lang="ts">
import { ref } from 'vue'
import { usePaletteStore } from '@/stores/paletteStore'
import ImageUpload from '@/components/ImageUpload.vue'
import PaletteDisplay from '@/components/PaletteDisplay.vue'
import UIPreview from '@/components/UIPreview.vue'
import PaletteHistory from '@/components/PaletteHistory.vue'

const store = usePaletteStore()
const showSaveModal = ref(false)
const paletteName = ref('')
const selectedTags = ref<string[]>([])
const tagInput = ref('')

const availableTags = ['暖色', '冷色', '自然', '商务', '清新', '复古', '科技', '柔和']

function toggleTag(tag: string) {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

function openSaveModal() {
  paletteName.value = '我的配色方案'
  selectedTags.value = []
  showSaveModal.value = true
}

function handleSave() {
  if (!paletteName.value.trim()) {
    paletteName.value = '未命名配色'
  }
  store.savePalette(paletteName.value, [...selectedTags.value])
  showSaveModal.value = false
}

function handleExport() {
  store.downloadExport()
}

function handleLoad() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          if (data.colors && Array.isArray(data.colors)) {
            alert('请将JSON文件内容保存为调色板后再使用')
          }
        } catch {
          alert('无效的JSON文件')
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-left">
        <h1 class="app-title">🎨 智能配色板</h1>
      </div>
      <div class="header-right">
        <button class="header-btn" @click="openSaveModal">
          💾 保存
        </button>
        <button class="header-btn" @click="handleExport">
          📤 导出
        </button>
        <button class="header-btn" @click="handleLoad">
          📥 加载
        </button>
      </div>
    </header>

    <main class="app-main">
      <aside class="sidebar left-sidebar">
        <ImageUpload />
        <div class="divider"></div>
        <PaletteHistory />
      </aside>

      <section class="center-section">
        <PaletteDisplay />
      </section>

      <aside class="sidebar right-sidebar">
        <UIPreview />
      </aside>
    </main>

    <div v-if="showSaveModal" class="modal-overlay" @click="showSaveModal = false">
      <div class="modal" @click.stop>
        <h3 class="modal-title">保存调色板</h3>
        
        <div class="form-group">
          <label class="form-label">名称</label>
          <input
            v-model="paletteName"
            type="text"
            class="form-input"
            placeholder="输入调色板名称"
          />
        </div>

        <div class="form-group">
          <label class="form-label">标签</label>
          <div class="tag-list">
            <button
              v-for="tag in availableTags"
              :key="tag"
              class="tag-btn"
              :class="{ active: selectedTags.includes(tag) }"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="showSaveModal = false">取消</button>
          <button class="btn-confirm" @click="handleSave">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
}

.app-title {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 8px;
}

.header-btn {
  padding: 8px 18px;
  border-radius: 20px;
  background: #f0f0f0;
  color: #333;
  font-size: 13px;
  font-weight: 500;
}

.header-btn:hover {
  background: #e0e0e0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.app-main {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr 350px;
  gap: 24px;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.left-sidebar {
  align-items: stretch;
}

.right-sidebar {
  align-items: flex-start;
}

.center-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 40px;
}

.divider {
  height: 1px;
  background: #e0e0e0;
  margin: 8px 0;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal {
  width: 400px;
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
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

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 20px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  border-color: #4a90d9;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-btn {
  padding: 6px 14px;
  border-radius: 16px;
  background: #f0f0f0;
  color: #666;
  font-size: 12px;
  border: 1px solid transparent;
}

.tag-btn:hover {
  background: #e0e0e0;
}

.tag-btn.active {
  background: #e8f4ff;
  color: #4a90d9;
  border-color: #4a90d9;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-cancel {
  padding: 8px 20px;
  border-radius: 8px;
  background: #f0f0f0;
  color: #666;
  font-size: 14px;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-confirm {
  padding: 8px 24px;
  border-radius: 8px;
  background: #4a90d9;
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.btn-confirm:hover {
  background: #3a80c9;
  transform: translateY(-1px);
}

@media (max-width: 1024px) {
  .app-main {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 16px;
  }

  .center-section {
    order: 1;
    padding-top: 0;
  }

  .left-sidebar {
    order: 2;
  }

  .right-sidebar {
    order: 3;
  }

  .app-header {
    padding: 12px 16px;
  }

  .app-title {
    font-size: 18px;
  }

  .header-btn {
    padding: 6px 14px;
    font-size: 12px;
  }

  .modal {
    width: calc(100% - 32px);
    max-width: 400px;
    margin: 16px;
  }
}
</style>
