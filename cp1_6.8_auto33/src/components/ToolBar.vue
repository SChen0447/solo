<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <div class="logo-section">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" rx="1" fill="#3498DB" stroke="#3498DB"/>
          <rect x="14" y="3" width="7" height="7" rx="1" fill="#E74C3C" stroke="#E74C3C"/>
          <rect x="3" y="14" width="7" height="7" rx="1" fill="#2ECC71" stroke="#2ECC71"/>
          <rect x="14" y="14" width="7" height="7" rx="1" fill="#F39C12" stroke="#F39C12"/>
        </svg>
        <span class="logo-text">像素拼图</span>
      </div>
    </div>

    <div class="toolbar-center">
      <div class="tool-group">
        <button 
          class="tool-btn" 
          :class="{ disabled: !store.canUndo }"
          @click="handleUndo"
          title="撤销 (Ctrl+Z)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          <span class="btn-text">撤销</span>
        </button>

        <button 
          class="tool-btn" 
          :class="{ disabled: !store.canRedo }"
          @click="handleRedo"
          title="重做 (Ctrl+Y / Ctrl+Shift+Z)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"></path>
          </svg>
          <span class="btn-text">重做</span>
        </button>
      </div>

      <div class="divider"></div>

      <div class="tool-group">
        <button 
          class="tool-btn"
          @click="handleClear"
          :class="{ disabled: store.filledCount === 0 }"
          title="清除所有填充"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span class="btn-text">清除</span>
        </button>

        <button 
          class="tool-btn primary"
          @click="handleExport"
          :class="{ loading: store.isExporting }"
          :disabled="store.isExporting"
          title="导出为PNG图片"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span class="btn-text">{{ store.isExporting ? '导出中...' : '导出' }}</span>
        </button>
      </div>

      <div class="divider"></div>

      <div class="zoom-group">
        <button 
          class="icon-btn" 
          @click="zoomOut"
          title="缩小"
          :disabled="store.zoom <= 0.5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        
        <div class="zoom-slider-container">
          <input 
            type="range"
            :min="0.5"
            :max="4"
            :step="0.1"
            :value="store.zoom"
            @input="handleZoomChange"
            class="zoom-slider"
          />
        </div>
        
        <button 
          class="icon-btn" 
          @click="zoomIn"
          title="放大"
          :disabled="store.zoom >= 4"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        
        <span class="zoom-value">{{ Math.round(store.zoom * 100) }}%</span>
      </div>

      <div class="divider"></div>

      <button 
        class="tool-btn"
        @click="handleResetView"
        title="重置视图"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
          <path d="M3 3v5h5"></path>
        </svg>
        <span class="btn-text">重置</span>
      </button>
    </div>

    <div class="toolbar-right">
      <button 
        class="icon-btn theme-btn"
        @click="store.toggleTheme"
        :title="store.theme === 'light' ? '切换到深色模式' : '切换到浅色模式'"
      >
        <svg v-if="store.theme === 'light'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      </button>
    </div>

    <div v-if="store.isExporting" class="export-progress-overlay">
      <div class="export-progress-bar">
        <div 
          class="export-progress-fill" 
          :style="{ width: store.exportProgress + '%' }"
        ></div>
      </div>
      <span class="export-progress-text">正在导出... {{ Math.round(store.exportProgress) }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePuzzleStore } from '@/stores/puzzleStore'

const store = usePuzzleStore()

function handleUndo() {
  if (!store.canUndo) return
  store.undo()
}

function handleRedo() {
  if (!store.canRedo) return
  store.redo()
}

function handleClear() {
  if (store.filledCount === 0) return
  if (confirm('确定要清除所有填充吗？此操作可以撤销。')) {
    store.clearAll()
  }
}

async function handleExport() {
  if (store.isExporting) return
  
  try {
    const dataUrl = await store.exportImage()
    
    const link = document.createElement('a')
    link.download = `pixel-puzzle-${Date.now()}.png`
    link.href = dataUrl
    link.click()
    
    store.setStatusMessage('图片导出成功！')
  } catch (error) {
    store.setStatusMessage('导出失败，请重试')
  }
}

function zoomIn() {
  store.setZoom(Math.min(4, store.zoom + 0.1))
}

function zoomOut() {
  store.setZoom(Math.max(0.5, store.zoom - 0.1))
}

function handleZoomChange(event: Event) {
  const input = event.target as HTMLInputElement
  const zoom = parseFloat(input.value)
  store.setZoom(zoom)
}

function handleResetView() {
  store.setZoom(1)
  store.setPan(0, 0)
  store.setStatusMessage('视图已重置')
}
</script>

<style scoped>
.toolbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: var(--bg-toolbar);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-color);
  z-index: 100;
  transition: background-color var(--transition-normal),
              border-color var(--transition-normal);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-dark), var(--primary-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  transition: all var(--transition-fast);
  background: transparent;
  position: relative;
}

.tool-btn:hover:not(.disabled):not(:disabled) {
  background: var(--bg-secondary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.tool-btn:active:not(.disabled):not(:disabled) {
  transform: translateY(1px);
  box-shadow: none;
}

.tool-btn.primary {
  background: var(--primary-accent);
  color: white;
}

.tool-btn.primary:hover:not(:disabled) {
  background: #2980b9;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
}

.tool-btn.disabled,
.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-text {
  white-space: nowrap;
}

.divider {
  width: 1px;
  height: 24px;
  background: var(--border-color);
  margin: 0 8px;
  transition: background-color var(--transition-normal);
}

.zoom-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: var(--text-primary);
  transition: all var(--transition-fast);
  background: transparent;
}

.icon-btn:hover:not(:disabled) {
  background: var(--bg-secondary);
  transform: translateY(-1px);
}

.icon-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.theme-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.theme-btn:hover {
  transform: rotate(15deg);
  box-shadow: var(--shadow-sm);
}

.zoom-slider-container {
  width: 100px;
}

.zoom-slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--border-color);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  transition: background-color var(--transition-normal);
}

.zoom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--primary-accent);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform var(--transition-fast);
}

.zoom-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.zoom-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--primary-accent);
  cursor: pointer;
  border: none;
}

.zoom-value {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  min-width: 40px;
  text-align: right;
  font-family: monospace;
  transition: color var(--transition-normal);
}

.export-progress-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--bg-secondary);
  transition: background-color var(--transition-normal);
}

.export-progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.export-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-accent), #2ECC71);
  background-size: 40px 100%;
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.2) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.2) 75%,
    transparent 75%,
    transparent
  );
  animation: progress-stripes 1s linear infinite;
  transition: width 0.2s ease;
}

@keyframes progress-stripes {
  from { background-position: 0 0; }
  to { background-position: 40px 0; }
}

.export-progress-text {
  position: absolute;
  top: -24px;
  right: 24px;
  font-size: 11px;
  color: var(--text-secondary);
  transition: color var(--transition-normal);
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 12px;
    padding: 12px 16px;
  }
  
  .toolbar-center {
    flex-wrap: wrap;
    width: 100%;
  }
  
  .logo-text {
    display: none;
  }
  
  .btn-text {
    display: none;
  }
  
  .tool-btn {
    padding: 10px;
  }
  
  .zoom-slider-container {
    width: 60px;
  }
}
</style>
