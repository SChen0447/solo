<template>
  <aside class="toolbar" :class="{ collapsed: isCollapsed }">
    <div class="toolbar-header">
      <span v-if="!isCollapsed" class="toolbar-title">工具</span>
    </div>
    <div class="toolbar-items">
      <button
        v-for="tool in tools"
        :key="tool.id"
        class="tool-item"
        :class="{ active: currentTool === tool.id }"
        @click="$emit('select-tool', tool.id)"
      >
        <span class="tool-icon" v-html="tool.icon"></span>
        <span v-if="!isCollapsed" class="tool-label">{{ tool.label }}</span>
      </button>
    </div>
    <div class="toolbar-divider" v-if="!isCollapsed"></div>
    <div class="toolbar-items">
      <button class="tool-item" @click="$emit('undo')" :disabled="!canUndo">
        <span class="tool-icon">↶</span>
        <span v-if="!isCollapsed" class="tool-label">撤销</span>
      </button>
      <button class="tool-item" @click="$emit('redo')" :disabled="!canRedo">
        <span class="tool-icon">↷</span>
        <span v-if="!isCollapsed" class="tool-label">重做</span>
      </button>
    </div>
    <div class="toolbar-divider" v-if="!isCollapsed"></div>
    <div class="toolbar-items">
      <button class="tool-item" @click="$emit('export')">
        <span class="tool-icon">📤</span>
        <span v-if="!isCollapsed" class="tool-label">导出</span>
      </button>
      <button class="tool-item" @click="$emit('share')">
        <span class="tool-icon">🔗</span>
        <span v-if="!isCollapsed" class="tool-label">分享</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { ToolType } from '@/types'

defineProps<{
  currentTool: ToolType
  isCollapsed: boolean
  canUndo: boolean
  canRedo: boolean
}>()

defineEmits<{
  (e: 'select-tool', tool: ToolType): void
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'export'): void
  (e: 'share'): void
}>()

const tools = [
  { id: 'select', label: '选择', icon: '↖' },
  { id: 'button', label: '按钮', icon: '◼' },
  { id: 'card', label: '卡片', icon: '▭' },
  { id: 'modal', label: '弹窗', icon: '▢' },
  { id: 'slider', label: '滑动条', icon: '━' }
]
</script>

<style scoped>
.toolbar {
  width: 180px;
  background: rgba(26, 26, 46, 0.95);
  border-right: 1px solid #33333a;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease-out;
  overflow: hidden;
  flex-shrink: 0;
  backdrop-filter: blur(10px);
}

.toolbar.collapsed {
  width: 60px;
}

.toolbar-header {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #33333a;
  padding: 0 16px;
}

.toolbar-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.toolbar-items {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  color: #aaa;
  cursor: pointer;
  transition: all 0.2s ease-out;
  font-size: 13px;
  width: 100%;
  text-align: left;
}

.tool-item:hover:not(:disabled) {
  background: linear-gradient(90deg, rgba(233, 69, 96, 0.2) 0%, transparent 100%);
  color: #fff;
}

.tool-item.active {
  background: linear-gradient(90deg, rgba(233, 69, 96, 0.3) 0%, transparent 100%);
  color: #e94560;
  border-left: 3px solid #e94560;
  padding-left: 13px;
}

.tool-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.tool-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar-divider {
  height: 1px;
  background: #33333a;
  margin: 4px 0;
}

.collapsed .toolbar-header {
  padding: 0;
  justify-content: center;
}

.collapsed .tool-item {
  justify-content: center;
  padding: 10px;
}

.collapsed .tool-item.active {
  border-left: none;
  border-bottom: 3px solid #e94560;
  padding-bottom: 7px;
}
</style>
