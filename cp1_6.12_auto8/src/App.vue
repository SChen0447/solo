<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useFeedbackStore } from '@/stores/feedbackStore'
import type { ViewMode, UrgencyLevel, FeedbackStatus } from '@/types/feedback'
import FeedbackCard from '@/components/FeedbackCard.vue'
import FeedbackForm from '@/components/FeedbackForm.vue'
import FeedbackModal from '@/components/FeedbackModal.vue'
import VirtualList from '@/components/VirtualList.vue'

const store = useFeedbackStore()
const isMobileMenuOpen = ref(false)
const showForm = ref(false)
const activeFilterDropdown = ref<'urgency' | 'status' | null>(null)

const urgencyOptions: { value: UrgencyLevel | 'all'; label: string }[] = [
  { value: 'all', label: '全部等级' },
  { value: 'normal', label: '普通' },
  { value: 'urgent', label: '紧急' },
  { value: 'critical', label: '特急' }
]

const statusOptions: { value: FeedbackStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '未处理' },
  { value: 'processing', label: '处理中' },
  { value: 'resolved', label: '已解决' }
]

onMounted(() => {
  store.loadFeedbacks()
})

function toggleViewMode(mode: ViewMode) {
  store.setViewMode(mode)
}

function handleSearch(e: Event) {
  const target = e.target as HTMLInputElement
  store.setFilters({ searchKeyword: target.value })
}

function handleUrgencyFilter(value: UrgencyLevel | 'all') {
  store.setFilters({ urgency: value })
  activeFilterDropdown.value = null
}

function handleStatusFilter(value: FeedbackStatus | 'all') {
  store.setFilters({ status: value })
  activeFilterDropdown.value = null
}

function toggleFilterDropdown(type: 'urgency' | 'status') {
  activeFilterDropdown.value = activeFilterDropdown.value === type ? null : type
}

function getUrgencyLabel(urgency: UrgencyLevel | 'all') {
  return urgencyOptions.find(o => o.value === urgency)?.label || '全部等级'
}

function getStatusLabel(status: FeedbackStatus | 'all') {
  return statusOptions.find(o => o.value === status)?.label || '全部状态'
}

function handleCardClick(id: string) {
  const feedback = store.feedbacks.find(f => f.id === id)
  if (feedback) {
    store.selectFeedback(feedback)
  }
}

function handleCloseModal() {
  store.selectFeedback(null)
}

const columns = computed(() => [
  { key: 'normal' as UrgencyLevel, title: '普通', count: store.feedbacksByUrgency.normal.length, color: '#10b981' },
  { key: 'urgent' as UrgencyLevel, title: '紧急', count: store.feedbacksByUrgency.urgent.length, color: '#f59e0b' },
  { key: 'critical' as UrgencyLevel, title: '特急', count: store.feedbacksByUrgency.critical.length, color: '#ef4444' }
])

function handleDragStart(e: DragEvent, id: string) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

function handleDrop(e: DragEvent, urgency: UrgencyLevel, targetIndex: number) {
  e.preventDefault()
  const draggedId = e.dataTransfer?.getData('text/plain')
  if (!draggedId) return

  const columnFeedbacks = store.feedbacksByUrgency[urgency]
  const draggedIndex = columnFeedbacks.findIndex(f => f.id === draggedId)
  if (draggedIndex === -1 || draggedIndex === targetIndex) return

  const newOrder = [...columnFeedbacks]
  const [removed] = newOrder.splice(draggedIndex, 1)
  newOrder.splice(targetIndex, 0, removed)

  const ids = newOrder.map(f => f.id)
  store.updateOrder(urgency, ids)
}

function renderCard(item: any) {
  return (
    <FeedbackCard
      feedback={item}
      highlighted={store.isHighlighted(item)}
      onClick={() => handleCardClick(item.id)}
      onDragStart={(e: DragEvent) => handleDragStart(e, item.id)}
    />
  )
}
</script>

<template>
  <div class="app-container">
    <header class="navbar">
      <div class="navbar-content">
        <div class="navbar-left">
          <button class="menu-toggle" @click="isMobileMenuOpen = !isMobileMenuOpen">
            <span class="hamburger"></span>
          </button>
          <h1 class="logo">反馈管理看板</h1>
        </div>

        <div class="navbar-stats" :class="{ 'mobile-open': isMobileMenuOpen }">
          <div class="stat-item">
            <span class="stat-label">今日新增</span>
            <span class="stat-value">{{ store.statistics.todayCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">待处理</span>
            <span class="stat-value">{{ store.statistics.pendingCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">平均响应</span>
            <span class="stat-value">{{ store.statistics.avgResponseTime }}分钟</span>
          </div>
        </div>

        <button class="btn-primary" @click="showForm = true">
          <span class="btn-icon">+</span>
          提交反馈
        </button>
      </div>
    </header>

    <main class="main-content">
      <div class="toolbar">
        <div class="search-container">
          <input
            type="text"
            class="search-input"
            placeholder="搜索标题、描述或来源..."
            :value="store.filters.searchKeyword"
            @input="handleSearch"
          />
        </div>

        <div class="filter-group">
          <div class="filter-dropdown">
            <button
              class="filter-btn"
              @click="toggleFilterDropdown('urgency')"
              :class="{ active: activeFilterDropdown === 'urgency' }"
            >
              {{ getUrgencyLabel(store.filters.urgency) }}
              <span class="dropdown-arrow">▼</span>
            </button>
            <transition name="fade">
              <div v-if="activeFilterDropdown === 'urgency'" class="dropdown-menu">
                <button
                  v-for="option in urgencyOptions"
                  :key="option.value"
                  class="dropdown-item"
                  :class="{ selected: store.filters.urgency === option.value }"
                  @click="handleUrgencyFilter(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </transition>
          </div>

          <div class="filter-dropdown">
            <button
              class="filter-btn"
              @click="toggleFilterDropdown('status')"
              :class="{ active: activeFilterDropdown === 'status' }"
            >
              {{ getStatusLabel(store.filters.status) }}
              <span class="dropdown-arrow">▼</span>
            </button>
            <transition name="fade">
              <div v-if="activeFilterDropdown === 'status'" class="dropdown-menu">
                <button
                  v-for="option in statusOptions"
                  :key="option.value"
                  class="dropdown-item"
                  :class="{ selected: store.filters.status === option.value }"
                  @click="handleStatusFilter(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </transition>
          </div>
        </div>

        <div class="view-toggle">
          <button
            class="view-btn"
            :class="{ active: store.viewMode === 'kanban' }"
            @click="toggleViewMode('kanban')"
          >
            看板视图
          </button>
          <button
            class="view-btn"
            :class="{ active: store.viewMode === 'list' }"
            @click="toggleViewMode('list')"
          >
            列表视图
          </button>
        </div>
      </div>

      <div v-if="store.isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>

      <div v-else class="content-area">
        <transition name="fade" mode="out-in">
          <div v-if="store.viewMode === 'kanban'" key="kanban" class="kanban-board">
            <div
              v-for="column in columns"
              :key="column.key"
              class="kanban-column"
            >
              <div class="column-header">
                <div class="column-title">
                  <span class="urgency-dot" :style="{ backgroundColor: column.color }"></span>
                  <h3>{{ column.title }}</h3>
                  <span class="column-count">{{ column.count }}</span>
                </div>
              </div>
              <div
                class="column-content"
                @dragover="handleDragOver"
              >
                <transition-group
                  name="card"
                  tag="div"
                  class="card-list"
                >
                  <div
                    v-for="(feedback, index) in store.feedbacksByUrgency[column.key]"
                    :key="feedback.id"
                    class="card-wrapper"
                    :class="{
                      'highlighted': store.isHighlighted(feedback),
                      'dimmed': store.filters.searchKeyword && !store.isHighlighted(feedback)
                    }"
                    @dragover="handleDragOver"
                    @drop="handleDrop($event, column.key, index)"
                  >
                    <FeedbackCard
                      :feedback="feedback"
                      :highlighted="store.isHighlighted(feedback)"
                      @click="handleCardClick(feedback.id)"
                      @dragstart="handleDragStart($event, feedback.id)"
                      draggable="true"
                    />
                  </div>
                </transition-group>
                <div v-if="store.feedbacksByUrgency[column.key].length === 0" class="empty-column">
                  <span>暂无反馈</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else key="list" class="list-view">
            <div v-if="store.sortedFeedbacks.length > 50" class="list-container">
              <VirtualList
                :items="store.sortedFeedbacks"
                :item-height="120"
                :buffer="10"
                v-slot="{ item }"
              >
                <div
                  class="list-item-wrapper"
                  :class="{
                    'highlighted': store.isHighlighted(item),
                    'dimmed': store.filters.searchKeyword && !store.isHighlighted(item)
                  }"
                >
                  <FeedbackCard
                    :feedback="item"
                    :highlighted="store.isHighlighted(item)"
                    @click="handleCardClick(item.id)"
                  />
                </div>
              </VirtualList>
            </div>
            <div v-else class="list-container">
              <transition-group name="card" tag="div" class="simple-list">
                <div
                  v-for="feedback in store.sortedFeedbacks"
                  :key="feedback.id"
                  class="list-item-wrapper"
                  :class="{
                    'highlighted': store.isHighlighted(feedback),
                    'dimmed': store.filters.searchKeyword && !store.isHighlighted(feedback)
                  }"
                >
                  <FeedbackCard
                    :feedback="feedback"
                    :highlighted="store.isHighlighted(feedback)"
                    @click="handleCardClick(feedback.id)"
                  />
                </div>
              </transition-group>
            </div>
            <div v-if="store.sortedFeedbacks.length === 0" class="empty-list">
              <span>暂无匹配的反馈</span>
            </div>
          </div>
        </transition>
      </div>
    </main>

    <transition name="fade">
      <div v-if="showForm" class="form-overlay" @click.self="showForm = false">
        <transition name="scale">
          <div v-if="showForm" class="form-modal">
            <div class="modal-header">
              <h2>提交新反馈</h2>
              <button class="close-btn" @click="showForm = false">×</button>
            </div>
            <FeedbackForm @submit="showForm = false" @cancel="showForm = false" />
          </div>
        </transition>
      </div>
    </transition>

    <FeedbackModal
      v-if="store.selectedFeedback"
      :feedback="store.selectedFeedback"
      @close="handleCloseModal"
    />
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg);
}

.navbar {
  height: 56px;
  background-color: var(--color-primary);
  color: white;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow-md);
}

.navbar-content {
  max-width: 1600px;
  margin: 0 auto;
  height: 100%;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-toggle {
  display: none;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  align-items: center;
  justify-content: center;
  transition: background-color var(--transition-fast);
}

.menu-toggle:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.hamburger {
  width: 20px;
  height: 2px;
  background-color: white;
  position: relative;
  display: block;
}

.hamburger::before,
.hamburger::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 2px;
  background-color: white;
  left: 0;
}

.hamburger::before {
  top: -6px;
}

.hamburger::after {
  top: 6px;
}

.logo {
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
}

.navbar-stats {
  display: flex;
  gap: 32px;
  flex: 1;
  justify-content: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-accent);
}

.btn-primary {
  background-color: var(--color-accent);
  color: white;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.btn-primary:hover {
  background-color: var(--color-accent-light);
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 18px;
  font-weight: 700;
}

.main-content {
  flex: 1;
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.search-container {
  flex: 1;
  min-width: 200px;
}

.search-input {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: #f1f5f9;
  font-size: 14px;
  transition: all var(--transition-normal);
  outline: none;
}

.search-input:focus {
  background-color: white;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
}

.filter-group {
  display: flex;
  gap: 8px;
}

.filter-dropdown {
  position: relative;
}

.filter-btn {
  padding: 10px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all var(--transition-fast);
}

.filter-btn:hover,
.filter-btn.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.dropdown-arrow {
  font-size: 10px;
  transition: transform var(--transition-fast);
}

.filter-btn.active .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background-color: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 120px;
  z-index: 50;
  overflow: hidden;
}

.dropdown-item {
  width: 100%;
  padding: 10px 16px;
  text-align: left;
  font-size: 14px;
  transition: background-color var(--transition-fast);
}

.dropdown-item:hover {
  background-color: var(--color-bg);
}

.dropdown-item.selected {
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--color-accent);
  font-weight: 500;
}

.view-toggle {
  display: flex;
  background-color: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.view-btn {
  padding: 10px 16px;
  font-size: 14px;
  transition: all var(--transition-fast);
}

.view-btn.active {
  background-color: var(--color-primary);
  color: white;
}

.view-btn:not(.active):hover {
  background-color: var(--color-bg);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px;
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.content-area {
  flex: 1;
  min-height: 0;
}

.kanban-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  height: 100%;
}

.kanban-column {
  background-color: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  min-height: 400px;
  transition: box-shadow var(--transition-fast);
}

.kanban-column:hover {
  box-shadow: var(--shadow-md);
}

.column-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.column-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.urgency-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.column-title h3 {
  font-size: 16px;
  font-weight: 600;
  flex: 1;
}

.column-count {
  background-color: var(--color-bg);
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.column-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  min-height: 200px;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-wrapper {
  transition: all var(--transition-normal);
}

.card-wrapper.highlighted {
  animation: pulse-highlight 2s ease-in-out infinite;
}

.card-wrapper.dimmed {
  opacity: 0.3;
  pointer-events: none;
}

@keyframes pulse-highlight {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(245, 158, 11, 0);
  }
}

.empty-column,
.empty-list {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.list-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-container {
  overflow-y: auto;
  flex: 1;
}

.simple-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-item-wrapper {
  transition: all var(--transition-normal);
}

.list-item-wrapper.highlighted {
  animation: pulse-highlight 2s ease-in-out infinite;
}

.list-item-wrapper.dimmed {
  opacity: 0.3;
  pointer-events: none;
}

.form-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
}

.form-modal {
  background-color: white;
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  font-size: 24px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.close-btn:hover {
  background-color: var(--color-bg);
  color: var(--color-text);
}

.card-move,
.card-enter-active,
.card-leave-active {
  transition: all var(--transition-normal);
}

.card-enter-from,
.card-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.card-leave-active {
  position: absolute;
  width: 100%;
}

@media (max-width: 768px) {
  .menu-toggle {
    display: flex;
  }

  .navbar-stats {
    position: absolute;
    top: 56px;
    left: 0;
    right: 0;
    background-color: var(--color-primary);
    padding: 16px 24px;
    flex-direction: row;
    justify-content: space-around;
    gap: 16px;
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
    transition: all var(--transition-normal);
    z-index: 99;
  }

  .navbar-stats.mobile-open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }

  .stat-value {
    font-size: 16px;
  }

  .main-content {
    padding: 16px;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    flex-wrap: wrap;
  }

  .view-toggle {
    width: 100%;
  }

  .view-btn {
    flex: 1;
  }

  .kanban-board {
    grid-template-columns: 1fr;
  }

  .kanban-column {
    min-height: 200px;
  }

  .column-content {
    max-height: 300px;
  }
}
</style>
