<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-inner">
        <div class="logo-section">
          <div class="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <path d="M2 8h20"></path>
              <path d="M8 4v4"></path>
              <path d="M16 4v4"></path>
            </svg>
          </div>
          <h1 class="app-title">我的电影收藏</h1>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary btn-add" @click="openAdd">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>添加电影</span>
          </button>
        </div>
      </div>
    </header>

    <div class="app-body">
      <aside class="sidebar">
        <div class="stats-panel">
          <h3 class="stats-title">数据概览</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ store.totalCount }}</div>
              <div class="stat-label">累计观影</div>
            </div>
            <div class="stat-item">
              <div class="stat-value accent">{{ store.avgRating }}</div>
              <div class="stat-label">平均评分</div>
            </div>
          </div>
          <div class="stat-item full">
            <div class="stat-label">最爱标签</div>
            <div class="favorite-tag">
              <span v-if="store.favoriteTag" class="tag-badge">{{ store.favoriteTag }}</span>
              <span v-else class="no-data">暂无数据</span>
            </div>
          </div>
        </div>

        <div class="stats-panel">
          <h3 class="stats-title">筛选标签</h3>
          <div v-if="store.allTags.length > 0" class="sidebar-tags">
            <button
              v-for="tag in store.allTags"
              :key="tag"
              class="sidebar-tag"
              :class="{ active: store.filter.tags.includes(tag) }"
              @click="store.toggleFilterTag(tag)"
            >{{ tag }}</button>
          </div>
          <div v-else class="no-data">暂无标签</div>
          <button
            v-if="store.filter.tags.length > 0"
            class="btn btn-clear"
            @click="store.clearFilterTags()"
          >清除标签筛选</button>
        </div>
      </aside>

      <main class="main-content">
        <router-view @openEdit="openEdit" />
      </main>
    </div>

    <AddMovieModal
      :visible="modalVisible"
      :movie="editingMovie"
      @close="closeModal"
      @submit="handleModalSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Movie } from '@/types'
import { useMovieStore } from '@/composables/useMovieStore'
import AddMovieModal from '@/components/AddMovieModal.vue'

const store = useMovieStore()

const modalVisible = ref(false)
const editingMovie = ref<Movie | null>(null)

function openAdd() {
  editingMovie.value = null
  modalVisible.value = true
}

function openEdit(movie: Movie) {
  editingMovie.value = movie
  modalVisible.value = true
}

function closeModal() {
  modalVisible.value = false
  editingMovie.value = null
}

function handleModalSubmit(data: Omit<Movie, 'id' | 'createdAt'>) {
  if (editingMovie.value) {
    store.updateMovie(editingMovie.value.id, data)
  } else {
    store.addMovie(data)
  }
  closeModal()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && modalVisible.value) {
    closeModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}

.header-inner {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--accent), #f0a04b);
  color: #1a1a2e;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 150ms ease, color 150ms ease, transform 150ms ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn:active {
  transform: scale(0.97);
}

.btn-primary {
  background-color: var(--accent);
  color: #1a1a2e;
  font-weight: 600;
}

.btn-primary:hover {
  background-color: var(--accent-hover);
}

.app-body {
  flex: 1;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 24px;
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 24px;
  align-items: start;
}

.sidebar {
  position: sticky;
  top: 96px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-panel {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.stats-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-item.full {
  margin-top: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-value.accent {
  color: var(--accent);
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.favorite-tag {
  margin-top: 8px;
}

.tag-badge {
  display: inline-block;
  font-size: 13px;
  padding: 4px 12px;
  background-color: rgba(230, 137, 43, 0.15);
  color: var(--accent);
  border-radius: 14px;
  border: 1px solid rgba(230, 137, 43, 0.3);
  font-weight: 500;
}

.no-data {
  font-size: 13px;
  color: var(--text-muted);
  font-style: italic;
}

.sidebar-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.sidebar-tag {
  font-size: 12px;
  padding: 5px 12px;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 150ms ease;
}

.sidebar-tag:hover {
  background-color: var(--border);
  color: var(--text-primary);
}

.sidebar-tag.active {
  background-color: rgba(230, 137, 43, 0.2);
  color: var(--accent);
  border-color: rgba(230, 137, 43, 0.4);
}

.btn-clear {
  background-color: transparent;
  color: var(--text-muted);
  font-size: 12px;
  padding: 4px 0;
  text-align: left;
}

.btn-clear:hover {
  color: var(--danger);
}

.main-content {
  min-width: 0;
}

@media (max-width: 768px) {
  .app-body {
    grid-template-columns: 1fr;
    padding: 16px;
    gap: 16px;
  }

  .sidebar {
    position: static;
    flex-direction: row;
    overflow-x: auto;
  }

  .stats-panel {
    min-width: 240px;
    flex-shrink: 0;
  }

  .header-inner {
    padding: 12px 16px;
  }

  .app-title {
    font-size: 16px;
  }

  .btn-add span {
    display: none;
  }

  .btn-add {
    padding: 10px 14px;
  }
}
</style>
