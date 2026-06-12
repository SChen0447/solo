<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Priority } from '../stores/taskStore'
import { useTaskStore } from '../stores/taskStore'
import TaskModal from './TaskModal.vue'

interface Props {
  taskId: string
  title: string
  description: string
  priority: Priority
  matched: boolean
}

const props = defineProps<Props>()

const store = useTaskStore()

const isDragging = ref(false)
const showMenu = ref(false)
const showModal = ref(false)

const priorityBarColor = computed(() => {
  switch (props.priority) {
    case 'high':
      return '#ef4444'
    case 'medium':
      return '#f59e0b'
    case 'low':
      return '#10b981'
  }
})

const priorityLabel = computed(() => {
  switch (props.priority) {
    case 'high':
      return '高优先级'
    case 'medium':
      return '中优先级'
    case 'low':
      return '低优先级'
  }
})

const handleDragStart = (e: DragEvent) => {
  isDragging.value = true
  store.setDraggedTaskId(props.taskId)
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', props.taskId)
  }
}

const handleDragEnd = () => {
  isDragging.value = false
  store.setDraggedTaskId(null)
}

const toggleMenu = (e: MouseEvent) => {
  e.stopPropagation()
  showMenu.value = !showMenu.value
}

const closeMenu = () => {
  showMenu.value = false
}

const handleEdit = () => {
  showMenu.value = false
  showModal.value = true
}

const handleDelete = () => {
  showMenu.value = false
  store.removeTask(props.taskId)
}

const handleSave = (data: { title: string; description: string; priority: Priority }) => {
  store.updateTask(props.taskId, data)
  showModal.value = false
}
</script>

<template>
  <div
    class="task-card"
    :class="{
      dragging: isDragging,
      'is-matched': matched,
      'is-unmatched': !matched
    }"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @click="closeMenu"
  >
    <div class="priority-bar" :style="{ background: priorityBarColor }" :title="priorityLabel" />

    <div class="card-header">
      <h4 class="card-title">{{ title }}</h4>
      <div class="menu-wrapper">
        <button class="menu-btn" @click.stop="toggleMenu">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <Transition name="dropdown">
          <div v-if="showMenu" class="menu-dropdown" @click.stop>
            <button class="menu-item edit-item" @click="handleEdit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              编辑
            </button>
            <button class="menu-item delete-item" @click="handleDelete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              删除
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <p v-if="description" class="card-description">{{ description }}</p>

    <TaskModal
      :visible="showModal"
      :title="title"
      :description="description"
      :priority="priority"
      :is-edit="true"
      @close="showModal = false"
      @save="handleSave"
    />
  </div>
</template>

<style scoped>
.task-card {
  position: relative;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: grab;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(255, 255, 255, 0.6) inset;
  transition:
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s ease,
    filter 0.2s ease;
  overflow: hidden;
  user-select: none;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.8) inset,
    0 0 20px rgba(139, 92, 246, 0.15);
}

.task-card.dragging {
  cursor: grabbing;
  transform: scale(1.05) rotate(2deg);
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.9) inset;
  opacity: 0.9;
  z-index: 100;
}

.task-card.is-unmatched {
  opacity: 0.3;
  filter: grayscale(0.5);
}

.task-card.is-matched {
  animation: highlightPulse 0.4s ease;
}

@keyframes highlightPulse {
  0% {
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.06),
      0 0 0 1px rgba(255, 255, 255, 0.6) inset;
  }
  50% {
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.06),
      0 0 0 1px rgba(255, 255, 255, 0.6) inset,
      0 0 25px rgba(99, 102, 241, 0.5);
  }
  100% {
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.06),
      0 0 0 1px rgba(255, 255, 255, 0.6) inset;
  }
}

.priority-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  transition: height 0.2s ease;
}

.task-card:hover .priority-bar {
  height: 6px;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
  margin-bottom: 10px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  line-height: 1.4;
  word-break: break-word;
}

.menu-wrapper {
  position: relative;
  flex-shrink: 0;
}

.menu-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 6px;
  transition: background 0.2s ease;
}

.menu-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.menu-btn span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #64748b;
  transition: background 0.2s ease;
}

.menu-btn:hover span {
  background: #334155;
}

.menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  min-width: 120px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 6px;
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.05) inset;
  z-index: 10;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  text-align: left;
}

.edit-item {
  color: #475569;
}

.edit-item:hover {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.delete-item {
  color: #64748b;
}

.delete-item:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.card-description {
  font-size: 13px;
  color: #64748b;
  line-height: 1.55;
  margin: 0;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
  transform-origin: top right;
}
</style>
