<script setup lang="ts">
import { computed, watch } from 'vue'
import { useTaskStore } from './stores/taskStore'
import TaskList from './components/TaskList.vue'

const store = useTaskStore()

const searchQuery = computed({
  get: () => store.searchQuery,
  set: (val: string) => store.setSearchQuery(val)
})

const totalMatched = computed(() => {
  if (!searchQuery.value.trim()) return null
  return store.filteredTasks.filter((t) => (t as { matched: boolean }).matched).length
})

const totalTasks = computed(() => store.tasks.length)

watch(searchQuery, () => {})
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <line x1="9" y1="4" x2="9" y2="20" />
              <line x1="15" y1="4" x2="15" y2="20" />
            </svg>
          </div>
          <div class="brand-text">
            <h1 class="brand-title">看板待办</h1>
            <p class="brand-subtitle">可视化任务管理面板</p>
          </div>
        </div>

        <div class="search-wrapper">
          <div class="search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="搜索所有任务..."
          />
          <Transition name="fade">
            <span v-if="totalMatched !== null" class="search-count">
              {{ totalMatched }}/{{ totalTasks }}
            </span>
          </Transition>
          <button
            v-if="searchQuery"
            class="search-clear"
            @click="searchQuery = ''"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="stats-group">
          <div class="stat-item">
            <span class="stat-dot high"></span>
            <span class="stat-label">高</span>
          </div>
          <div class="stat-item">
            <span class="stat-dot medium"></span>
            <span class="stat-label">中</span>
          </div>
          <div class="stat-item">
            <span class="stat-dot low"></span>
            <span class="stat-label">低</span>
          </div>
        </div>
      </div>
    </header>

    <main class="kanban-wrapper">
      <div class="kanban-board">
        <TaskList
          v-for="list in store.lists"
          :key="list.id"
          :list-id="list.id"
          :list-name="list.name"
        />
      </div>
    </main>

    <footer class="app-footer">
      <p>拖拽卡片移动任务 · 点击右上角 · 管理操作</p>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 20px 32px 0;
}

.header-inner {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 24px;
  padding: 18px 28px;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(255, 255, 255, 0.4) inset;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.brand-logo {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #a855f7 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  line-height: 1.2;
}

.brand-subtitle {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}

.search-wrapper {
  flex: 1;
  min-width: 280px;
  max-width: 500px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 16px;
  color: #94a3b8;
  pointer-events: none;
  z-index: 1;
}

.search-input {
  width: 100%;
  height: 44px;
  padding: 0 44px 0 46px;
  border: 1.5px solid transparent;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  color: #1e293b;
  outline: none;
  transition: all 0.2s ease;
  font-family: inherit;
}

.search-input::placeholder {
  color: #94a3b8;
}

.search-input:focus {
  border-color: #8b5cf6;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.12);
}

.search-count {
  position: absolute;
  right: 50px;
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  padding: 3px 10px;
  border-radius: 8px;
}

.search-clear {
  position: absolute;
  right: 12px;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.search-clear:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.stats-group {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.stat-dot.high {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
}

.stat-dot.medium {
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.5);
}

.stat-dot.low {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
}

.stat-label {
  font-size: 12px;
  font-weight: 500;
  color: #475569;
}

.kanban-wrapper {
  flex: 1;
  padding: 28px 32px 20px;
  overflow-x: auto;
}

.kanban-board {
  display: flex;
  gap: 24px;
  justify-content: center;
  align-items: flex-start;
  min-height: 100%;
}

.app-footer {
  padding: 12px 32px 24px;
  text-align: center;
}

.app-footer p {
  font-size: 12px;
  color: rgba(100, 116, 139, 0.8);
  margin: 0;
  letter-spacing: 0.3px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 1200px) {
  .kanban-board {
    flex-wrap: wrap;
  }
}

@media (max-width: 900px) {
  .app-header {
    padding: 16px 20px 0;
  }

  .header-inner {
    padding: 16px 20px;
    gap: 16px;
  }

  .stats-group {
    display: none;
  }

  .kanban-wrapper {
    padding: 24px 20px 16px;
  }

  .kanban-board {
    gap: 20px;
  }

  .app-footer {
    padding: 8px 20px 20px;
  }
}

@media (max-width: 640px) {
  .app-header {
    padding: 12px 16px 0;
  }

  .header-inner {
    padding: 14px 16px;
    border-radius: 20px;
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }

  .brand {
    justify-content: center;
  }

  .search-wrapper {
    min-width: 100%;
    max-width: 100%;
  }

  .kanban-wrapper {
    padding: 20px 16px 12px;
  }

  .kanban-board {
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .app-footer {
    padding: 6px 16px 16px;
  }
}
</style>
