<script setup lang="ts">
import { ref } from 'vue'
import TimeLine from './components/TimeLine.vue'
import TaskForm from './components/TaskForm.vue'
import { useTaskStore, type Task } from './store/taskStore'

const taskStore = useTaskStore()

const showForm = ref(false)
const editingTask = ref<Task | null>(null)

function handleAddTask() {
  editingTask.value = null
  showForm.value = true
}

function handleEditTask(task: Task) {
  editingTask.value = task
  showForm.value = true
}

function handleFormClose() {
  showForm.value = false
  editingTask.value = null
}

function handleDeleteTask(task: Task, e: Event) {
  e.stopPropagation()
  if (confirm(`确定要删除"${task.title}"吗？`)) {
    taskStore.deleteTask(task.id)
  }
}
</script>

<template>
  <div class="app-container">
    <div class="app-header">
      <div class="header-content">
        <div class="logo-section">
          <div class="logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="logo-text">
            <h1 class="app-title">时间线</h1>
            <p class="app-subtitle">可视化管理你的一天</p>
          </div>
        </div>
        <button class="add-btn" @click="handleAddTask">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          添加任务
        </button>
      </div>
    </div>

    <main class="app-main">
      <TimeLine @edit-task="handleEditTask" />

      <div class="task-list-section">
        <div class="section-header">
          <h2>任务列表</h2>
          <span class="task-count">{{ taskStore.tasks.length }} 个任务</span>
        </div>
        <div class="task-list">
          <div
            v-for="task in taskStore.sortedTasks"
            :key="task.id"
            class="task-item"
            :class="{ 'is-conflicted': taskStore.isTaskConflicted(task.id) }"
            @click="handleEditTask(task)"
          >
            <div class="task-priority-bar" :style="{ background: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f97316' : '#22c55e' }"></div>
            <div class="task-info">
              <h3 class="task-name">{{ task.title }}</h3>
              <div class="task-meta">
                <span class="task-time">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  {{ task.startTime }} - {{ task.endTime }}
                </span>
                <span class="task-priority-tag" :class="task.priority">
                  {{ task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低' }}
                </span>
              </div>
              <p v-if="task.note" class="task-note">{{ task.note }}</p>
            </div>
            <button class="delete-btn" @click="handleDeleteTask(task, $event)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
              </svg>
            </button>
          </div>
          <div v-if="taskStore.tasks.length === 0" class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <p>暂无任务，点击上方按钮添加</p>
          </div>
        </div>
      </div>
    </main>

    <TaskForm
      :visible="showForm"
      :editing-task="editingTask"
      @close="handleFormClose"
      @submit="handleFormClose"
    />
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  background: #1e1e2e;
  background-image: linear-gradient(180deg, #252538 0%, #1e1e2e 30%, #1a1a28 100%);
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(30, 30, 46, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.app-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-subtitle {
  margin: 2px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.add-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
}

.add-btn:active {
  transform: translateY(0);
}

.app-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 0;
}

.task-list-section {
  margin-top: 40px;
  padding: 0 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.task-count {
  font-size: 13px;
  color: #6b7280;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-item {
  display: flex;
  align-items: stretch;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.task-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

.task-item.is-conflicted {
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.05);
}

.task-item.is-conflicted:hover {
  border-color: rgba(239, 68, 68, 0.7);
  background: rgba(239, 68, 68, 0.08);
}

.task-priority-bar {
  width: 4px;
  flex-shrink: 0;
}

.task-info {
  flex: 1;
  padding: 14px 16px;
  min-width: 0;
}

.task-name {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #9ca3af;
}

.task-priority-tag {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 6px;
}

.task-priority-tag.high {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.task-priority-tag.medium {
  background: rgba(249, 115, 22, 0.15);
  color: #f97316;
}

.task-priority-tag.low {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.task-note {
  margin: 8px 0 0;
  font-size: 13px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

@media (max-width: 767px) {
  .header-content {
    padding: 14px 16px;
  }

  .app-title {
    font-size: 18px;
  }

  .app-subtitle {
    font-size: 12px;
  }

  .add-btn {
    padding: 8px 14px;
    font-size: 13px;
  }

  .add-btn svg {
    width: 18px;
    height: 18px;
  }

  .app-main {
    padding: 24px 0;
  }

  .task-list-section {
    margin-top: 32px;
    padding: 0 16px;
  }

  .section-header h2 {
    font-size: 16px;
  }
}
</style>
