<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '../stores/taskStore'
import type { Priority } from '../stores/taskStore'
import TaskCard from './TaskCard.vue'
import TaskModal from './TaskModal.vue'

interface Props {
  listId: string
  listName: string
}

const props = defineProps<Props>()
const store = useTaskStore()

const isDragOver = ref(false)
const dragOverIndex = ref<number | null>(null)
const showAddModal = ref(false)

const listTasks = computed(() => {
  const tasksWithMatch = (store.getTasksByListId(props.listId).value as Array<{
    id: string
    title: string
    description: string
    priority: Priority
    listId: string
    matched: boolean
  }>)
  return tasksWithMatch
})

const taskCount = computed(() => listTasks.value.length)

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (!store.draggedTaskId) return
  isDragOver.value = true

  const cards = (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('.task-card')
  let newIndex = cards.length

  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    if (offsetY < rect.height / 2) {
      newIndex = i
      break
    }
  }

  dragOverIndex.value = newIndex
}

const handleDragLeave = (e: DragEvent) => {
  const target = e.currentTarget as HTMLElement
  const related = e.relatedTarget as HTMLElement | null
  if (related && target.contains(related)) return
  isDragOver.value = false
  dragOverIndex.value = null
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  const taskId = store.draggedTaskId || e.dataTransfer?.getData('text/plain')
  if (taskId && dragOverIndex.value !== null) {
    store.moveTask(taskId, props.listId, dragOverIndex.value)
  }
  isDragOver.value = false
  dragOverIndex.value = null
}

const handleAddTask = () => {
  showAddModal.value = true
}

const handleSaveNew = (data: { title: string; description: string; priority: Priority }) => {
  store.addTask(props.listId, data.title, data.description, data.priority)
  showAddModal.value = false
}
</script>

<template>
  <div
    class="task-list"
    :class="{ 'drag-over': isDragOver }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div class="list-header">
      <div class="list-title-group">
        <span class="list-icon"></span>
        <h3 class="list-title">{{ listName }}</h3>
        <span class="list-count">{{ taskCount }}</span>
      </div>
      <button class="add-btn" @click="handleAddTask" title="添加任务">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>

    <div class="list-body">
      <template v-for="(task, index) in listTasks" :key="task.id">
        <div
          v-if="dragOverIndex === index"
          class="drop-indicator"
          key="indicator-{{ index }}"
        />
        <TaskCard
          :task-id="task.id"
          :title="task.title"
          :description="task.description"
          :priority="task.priority"
          :matched="task.matched"
        />
      </template>
      <div
        v-if="dragOverIndex === listTasks.length"
        class="drop-indicator"
      />
      <div v-if="listTasks.length === 0 && !isDragOver" class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
        <p>暂无任务<br />点击 + 添加</p>
      </div>
    </div>

    <TaskModal
      :visible="showAddModal"
      title=""
      description=""
      priority="medium"
      :is-edit="false"
      @close="showAddModal = false"
      @save="handleSaveNew"
    />
  </div>
</template>

<style scoped>
.task-list {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 18px;
  min-height: 300px;
  max-height: calc(100vh - 220px);
  flex: 1;
  min-width: 280px;
  max-width: 360px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(255, 255, 255, 0.4) inset;
  transition:
    background 0.25s ease,
    box-shadow 0.25s ease;
}

.task-list.drag-over {
  background: rgba(255, 255, 255, 0.5);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(255, 255, 255, 0.6) inset,
    0 0 30px rgba(139, 92, 246, 0.2);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.list-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.list-icon {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);
}

.list-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.list-count {
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.add-btn:hover {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: #fff;
  transform: scale(1.05);
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
}

.list-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  margin-right: -4px;
}

.list-body::-webkit-scrollbar {
  width: 6px;
}

.list-body::-webkit-scrollbar-track {
  background: transparent;
}

.list-body::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.list-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

.drop-indicator {
  height: 4px;
  margin-bottom: 12px;
  background: linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%);
  border-radius: 2px;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
  animation: indicatorPulse 0.8s ease-in-out infinite;
}

@keyframes indicatorPulse {
  0%, 100% {
    opacity: 0.6;
    transform: scaleX(0.98);
  }
  50% {
    opacity: 1;
    transform: scaleX(1);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #94a3b8;
  text-align: center;
}

.empty-state svg {
  opacity: 0.5;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}
</style>
