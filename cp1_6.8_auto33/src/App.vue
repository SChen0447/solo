<template>
  <div class="app-container" :data-theme="store.theme">
    <ToolBar />
    
    <div class="main-content">
      <div class="puzzle-panel">
        <div class="panel-header-section">
          <h2 class="panel-title">拼图画布</h2>
          <div class="panel-subtitle">
            <span v-if="store.hasImage">点击或拖拽填充颜色</span>
            <span v-else>请上传一张图片开始创作</span>
          </div>
        </div>
        <div class="puzzle-wrapper">
          <PuzzleGrid />
          
          <div v-if="!store.hasImage" class="empty-state">
            <div class="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <h3 class="empty-title">开始你的像素艺术创作</h3>
            <p class="empty-desc">上传任意图片，自动转换为像素风格拼图</p>
            <p class="empty-tips">提示：从右侧面板上传图片开始</p>
          </div>
        </div>
      </div>
      
      <div class="tool-panel">
        <ColorPalette />
      </div>
    </div>
    
    <div class="status-bar">
      <div class="status-left">
        <span class="status-dot"></span>
        <span class="status-text">{{ store.statusMessage }}</span>
      </div>
      <div class="status-right">
        <span v-if="store.hoveredCell" class="status-item">
          坐标: ({{ store.hoveredCell.x }}, {{ store.hoveredCell.y }})
        </span>
        <span v-if="store.selectedColor" class="status-item color-status">
          当前颜色: 
          <span class="status-color-swatch" :style="{ backgroundColor: store.selectedColor }"></span>
          {{ store.selectedColor }}
        </span>
        <span class="status-item">{{ store.gridSize }} × {{ store.gridSize }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import ToolBar from './components/ToolBar.vue'
import ColorPalette from './components/ColorPalette.vue'
import PuzzleGrid from './components/PuzzleGrid.vue'
import { usePuzzleStore } from './stores/puzzleStore'

const store = usePuzzleStore()

onMounted(() => {
  store.initTheme()
  store.initEmptyGrid(32)
})
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: var(--bg-primary);
  background-image: var(--paper-texture);
  transition: background-color var(--transition-normal),
              background-image var(--transition-normal);
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 20px;
  gap: 20px;
}

.puzzle-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.panel-header-section {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  transition: color var(--transition-normal);
}

.panel-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  transition: color var(--transition-normal);
}

.puzzle-wrapper {
  flex: 1;
  position: relative;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  transition: background-color var(--transition-normal),
              box-shadow var(--transition-normal);
}

.empty-state {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  z-index: 10;
  pointer-events: none;
  transition: background-color var(--transition-normal);
}

.empty-icon {
  color: var(--text-muted);
  margin-bottom: 20px;
  opacity: 0.6;
  transition: color var(--transition-normal);
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  transition: color var(--transition-normal);
}

.empty-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  transition: color var(--transition-normal);
}

.empty-tips {
  font-size: 12px;
  color: var(--text-muted);
  transition: color var(--transition-normal);
}

.tool-panel {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px;
  background: var(--bg-toolbar);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: background-color var(--transition-normal),
              border-color var(--transition-normal),
              color var(--transition-normal);
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  color: var(--text-secondary);
  transition: color var(--transition-normal);
}

.status-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: monospace;
  color: var(--text-secondary);
  transition: color var(--transition-normal);
}

.color-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-color-swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid var(--border-color);
  transition: border-color var(--transition-normal);
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
    padding: 12px;
    gap: 12px;
  }
  
  .puzzle-panel {
    min-height: 300px;
  }
  
  .tool-panel {
    width: 100%;
    max-height: 40vh;
  }
  
  .status-bar {
    padding: 6px 12px;
    font-size: 11px;
  }
  
  .status-right {
    gap: 10px;
  }
  
  .panel-header-section {
    margin-bottom: 10px;
  }
  
  .panel-title {
    font-size: 16px;
  }
}
</style>
