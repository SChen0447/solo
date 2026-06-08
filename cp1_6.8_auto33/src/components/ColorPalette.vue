<template>
  <div class="color-palette">
    <div class="panel-header">
      <h3 class="panel-title">颜色面板</h3>
    </div>

    <div class="upload-section">
      <label class="upload-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <span>上传图片</span>
        <input 
          type="file" 
          accept="image/jpeg,image/png" 
          @change="handleFileUpload"
          hidden
        />
      </label>
      <p class="upload-hint">支持 JPG、PNG，最大 10MB</p>
    </div>

    <div class="grid-size-section">
      <label class="section-label">网格尺寸</label>
      <div class="size-slider-container">
        <input 
          type="range" 
          :min="8" 
          :max="64" 
          :step="2"
          :value="store.gridSize"
          @input="handleGridSizeChange"
          class="size-slider"
        />
        <span class="size-value">{{ store.gridSize }} × {{ store.gridSize }}</span>
      </div>
    </div>

    <div class="palette-section">
      <label class="section-label">
        提取色板
        <span class="color-count">({{ store.palette.length }}色)</span>
      </label>
      <div class="color-grid">
        <div
          v-for="(color, index) in store.palette"
          :key="'palette-' + index"
          class="color-swatch"
          :class="{ selected: store.selectedColor === color }"
          :style="{ backgroundColor: color }"
          @click="selectColor(color)"
          :title="color"
        >
          <div class="color-ring"></div>
        </div>
      </div>
    </div>

    <div v-if="store.customColors.length > 0" class="palette-section">
      <label class="section-label">
        自定义颜色
        <span class="color-count">({{ store.customColors.length }}色)</span>
      </label>
      <div class="color-grid">
        <div
          v-for="(color, index) in store.customColors"
          :key="'custom-' + index"
          class="color-swatch"
          :class="{ selected: store.selectedColor === color }"
          :style="{ backgroundColor: color }"
          @click="selectColor(color)"
          :title="color"
        >
          <div class="color-ring"></div>
        </div>
      </div>
    </div>

    <div class="custom-color-section">
      <label class="section-label">添加自定义颜色</label>
      <div class="custom-color-input">
        <div 
          class="color-preview"
          :style="{ backgroundColor: previewColor }"
        ></div>
        <input 
          type="text" 
          v-model="hexInput"
          placeholder="#FFFFFF"
          maxlength="7"
          class="hex-input"
          @input="handleHexInput"
          @keyup.enter="addCustomColor"
        />
        <button 
          class="add-btn"
          @click="addCustomColor"
          :disabled="!isValidHex"
        >
          添加
        </button>
      </div>
    </div>

    <div class="stats-section">
      <div class="stat-item">
        <span class="stat-label">已填充</span>
        <span class="stat-value">{{ store.filledCount }} / {{ store.totalCells }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">完成度</span>
        <span class="stat-value">{{ completionPercent }}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: completionPercent + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePuzzleStore } from '@/stores/puzzleStore'

const store = usePuzzleStore()
const hexInput = ref('')
const isValidHex = ref(false)

const previewColor = computed(() => {
  if (isValidHex.value) {
    return hexInput.value
  }
  return '#CCCCCC'
})

const completionPercent = computed(() => {
  if (store.totalCells === 0) return 0
  return Math.round((store.filledCount / store.totalCells) * 100)
})

function selectColor(color: string) {
  store.setSelectedColor(color)
  store.setStatusMessage(`已选择颜色 ${color}`)
}

function handleHexInput() {
  let value = hexInput.value.trim()
  if (!value.startsWith('#')) {
    value = '#' + value
  }
  isValidHex.value = /^#[0-9A-Fa-f]{6}$/.test(value)
}

function addCustomColor() {
  if (!isValidHex.value) return
  
  let value = hexInput.value.trim().toUpperCase()
  if (!value.startsWith('#')) {
    value = '#' + value
  }
  
  store.addCustomColor(value)
  store.setSelectedColor(value)
  hexInput.value = ''
  isValidHex.value = false
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return
  
  if (!file.type.includes('jpeg') && !file.type.includes('png')) {
    store.setStatusMessage('只支持 JPG 和 PNG 格式的图片')
    return
  }
  
  if (file.size > 10 * 1024 * 1024) {
    store.setStatusMessage('图片大小不能超过 10MB')
    return
  }
  
  try {
    await store.loadImage(file, store.gridSize)
  } catch (error) {
    store.setStatusMessage('图片处理失败，请重试')
  }
  
  input.value = ''
}

function handleGridSizeChange(event: Event) {
  const input = event.target as HTMLInputElement
  const size = parseInt(input.value, 10)
  store.setGridSize(size)
}
</script>

<style scoped>
.color-palette {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  height: 100%;
  overflow-y: auto;
  transition: background-color var(--transition-normal),
              box-shadow var(--transition-normal);
}

.panel-header {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
  transition: border-color var(--transition-normal);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color var(--transition-normal);
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--primary-accent);
  color: white;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.upload-btn:hover {
  background: #2980b9;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
}

.upload-btn:active {
  transform: translateY(0);
}

.upload-hint {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  transition: color var(--transition-normal);
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 10px;
  transition: color var(--transition-normal);
}

.color-count {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: normal;
  transition: color var(--transition-normal);
}

.grid-size-section {
  display: flex;
  flex-direction: column;
}

.size-slider-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.size-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--border-color);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  transition: background-color var(--transition-normal);
}

.size-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-accent);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: transform var(--transition-fast),
              box-shadow var(--transition-fast);
}

.size-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 3px 10px rgba(52, 152, 219, 0.4);
}

.size-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-accent);
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.size-value {
  min-width: 60px;
  text-align: right;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  font-family: monospace;
  transition: color var(--transition-normal);
}

.palette-section {
  display: flex;
  flex-direction: column;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.color-swatch {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: transform var(--transition-fast),
              box-shadow var(--transition-fast);
}

.color-swatch:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.color-swatch.selected {
  transform: scale(1.1);
  z-index: 1;
}

.color-swatch.selected .color-ring {
  opacity: 1;
  transform: scale(1.3);
}

.color-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  border: 2px solid var(--primary-accent);
  border-radius: 10px;
  transform: translate(-50%, -50%) scale(1);
  opacity: 0;
  transition: all var(--transition-fast);
  pointer-events: none;
}

.custom-color-section {
  display: flex;
  flex-direction: column;
}

.custom-color-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-preview {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 2px solid var(--border-color);
  transition: border-color var(--transition-normal);
}

.hex-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-family: monospace;
  background: var(--bg-secondary);
  color: var(--text-primary);
  transition: border-color var(--transition-fast),
              background-color var(--transition-normal),
              color var(--transition-normal);
}

.hex-input:focus {
  border-color: var(--primary-accent);
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
}

.add-btn {
  padding: 8px 14px;
  background: var(--primary-dark);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.add-btn:hover:not(:disabled) {
  background: #34495e;
  transform: translateY(-1px);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stats-section {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color var(--transition-normal);
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  transition: color var(--transition-normal);
}

.stat-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: monospace;
  transition: color var(--transition-normal);
}

.progress-bar {
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
  transition: background-color var(--transition-normal);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-accent), #2ECC71);
  border-radius: 3px;
  transition: width var(--transition-normal);
}

@media (max-width: 768px) {
  .color-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .color-palette {
    max-height: none;
  }
}
</style>
