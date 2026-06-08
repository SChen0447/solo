<script setup lang="ts">
import { ref } from 'vue'
import { usePaletteStore } from '@/stores/paletteStore'

const store = usePaletteStore()
const dragIndex = ref<number | null>(null)

function handleDragStart(index: number) {
  dragIndex.value = index
}

function handleDragOver(e: DragEvent, index: number) {
  e.preventDefault()
  if (dragIndex.value === null || dragIndex.value === index) return
}

function handleDrop(e: DragEvent, toIndex: number) {
  e.preventDefault()
  if (dragIndex.value === null || dragIndex.value === toIndex) return
  store.reorderPalettes(dragIndex.value, toIndex)
  dragIndex.value = null
}

function handleDragEnd() {
  dragIndex.value = null
}

function loadPalette(id: string) {
  store.loadPalette(id)
}

function deletePalette(e: Event, id: string) {
  e.stopPropagation()
  if (confirm('确定要删除这个调色板吗？')) {
    store.deletePalette(id)
  }
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()}`
}
</script>

<template>
  <div class="palette-list">
    <h3 class="list-title">历史调色板</h3>

    <div v-if="store.savedPalettes.length === 0" class="empty-state">
      <p>暂无保存的调色板</p>
      <span>保存后会显示在这里</span>
    </div>

    <div v-else class="palette-items">
      <div
        v-for="(palette, index) in store.savedPalettes"
        :key="palette.id"
        class="palette-item"
        :class="{ dragging: dragIndex === index }"
        draggable="true"
        @dragstart="handleDragStart(index)"
        @dragover="handleDragOver($event, index)"
        @drop="handleDrop($event, index)"
        @dragend="handleDragEnd"
        @click="loadPalette(palette.id)"
      >
        <div class="item-colors">
          <div
            v-for="color in palette.colors.slice(0, 5)"
            :key="color.id"
            class="item-color"
            :style="{ backgroundColor: color.hex }"
          ></div>
        </div>
        <div class="item-info">
          <span class="item-name">{{ palette.name }}</span>
          <span class="item-date">{{ formatDate(palette.createdAt) }}</span>
        </div>
        <button
          class="delete-btn"
          title="删除"
          @click="deletePalette($event, palette.id)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.palette-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 24px;
  background: #fafafa;
  border-radius: 8px;
}

.empty-state p {
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
}

.empty-state span {
  font-size: 12px;
  color: #999;
}

.palette-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
}

.palette-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateX(2px);
}

.palette-item.dragging {
  opacity: 0.5;
}

.item-colors {
  display: flex;
  gap: 2px;
}

.item-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.item-color:first-child {
  border-radius: 4px 0 0 4px;
}

.item-color:last-child {
  border-radius: 0 4px 4px 0;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-date {
  font-size: 11px;
  color: #999;
}

.delete-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: transparent;
  color: #999;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s ease;
}

.palette-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #f0f0f0;
  color: #e74c3c;
}
</style>
