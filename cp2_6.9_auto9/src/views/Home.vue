<template>
  <div class="home-page">
    <div class="filter-bar">
      <div class="filter-row">
        <div class="filter-group">
          <label class="filter-label">排序</label>
          <select v-model="sortValue" class="filter-select" @change="handleSortChange">
            <option value="watchDateDesc">观看日期 (新→旧)</option>
            <option value="ratingDesc">评分 (高→低)</option>
            <option value="yearAsc">年份 (早→晚)</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">评分范围</label>
          <div class="range-group">
            <select v-model="ratingMin" class="filter-select small" @change="updateRatingRange">
              <option v-for="n in 10" :key="'min'+n" :value="n">{{ n }}分+</option>
            </select>
            <span class="range-sep">~</span>
            <select v-model="ratingMax" class="filter-select small" @change="updateRatingRange">
              <option v-for="n in 10" :key="'max'+n" :value="n">{{ n }}分</option>
            </select>
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label">年份</label>
          <div class="range-group">
            <input
              v-model.number="yearMin"
              type="number"
              class="filter-input small"
              placeholder="起始"
              min="1900"
              max="2100"
              @change="updateYearRange"
            />
            <span class="range-sep">~</span>
            <input
              v-model.number="yearMax"
              type="number"
              class="filter-input small"
              placeholder="结束"
              min="1900"
              max="2100"
              @change="updateYearRange"
            />
          </div>
        </div>

        <div class="filter-group right">
          <button class="btn btn-ghost" @click="resetAll">重置</button>
          <button class="btn btn-primary" @click="store.downloadCSV()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            导出看单
          </button>
        </div>
      </div>

      <div v-if="store.filter.tags.length > 0" class="active-tags-row">
        <span class="active-tags-label">已选：</span>
        <button
          v-for="tag in store.filter.tags"
          :key="tag"
          class="active-tag"
          @click="store.toggleFilterTag(tag)"
        >
          {{ tag }}
          <span class="remove">×</span>
        </button>
      </div>
    </div>

    <div class="list-header">
      <h2 class="result-count">
        共 <span class="accent">{{ displayList.length }}</span>
        部电影
        <span v-if="store.filter.tags.length > 0 || yearMin || yearMax || ratingMin > 1 || ratingMax < 10">
          (筛选后)
        </span>
      </h2>
    </div>

    <Transition name="fade" mode="out-in">
      <div v-if="paginatedList.length === 0" key="empty" class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
            <path d="M2 8h20"></path>
            <path d="M8 4v4"></path>
            <path d="M16 4v4"></path>
          </svg>
        </div>
        <h3 class="empty-title">
          {{ store.totalCount === 0 ? '还没有收藏任何电影' : '没有符合条件的电影' }}
        </h3>
        <p class="empty-desc">
          {{ store.totalCount === 0 ? '点击右上角的「添加电影」按钮开始记录你的观影吧！' : '试试调整筛选条件' }}
        </p>
      </div>

      <div v-else key="list" class="movie-grid">
        <MovieCard
          v-for="movie in paginatedList"
          :key="movie.id"
          :movie="movie"
          @click="openEdit(movie)"
        />
      </div>
    </Transition>

    <div v-if="totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="currentPage === 1"
        @click="currentPage--"
      >上一页</button>
      <div class="page-numbers">
        <button
          v-for="page in displayPageNumbers"
          :key="page"
          class="page-btn"
          :class="{ active: page === currentPage, ellipsis: page === '...' }"
          :disabled="page === '...'"
          @click="page !== '...' && (currentPage = page as number)"
        >{{ page }}</button>
      </div>
      <button
        class="page-btn"
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { SortKey, Movie } from '@/types'
import { useMovieStore } from '@/composables/useMovieStore'
import MovieCard from '@/components/MovieCard.vue'

const emit = defineEmits<{
  (e: 'openAdd'): void
  (e: 'openEdit', movie: Movie): void
}>()

const store = useMovieStore()
const PAGE_SIZE = 20
const VIRTUAL_THRESHOLD = 50

const sortValue = ref<SortKey>(store.filter.sortKey)
const ratingMin = ref(store.filter.ratingMin)
const ratingMax = ref(store.filter.ratingMax)
const yearMin = ref<number | ''>(store.filter.yearMin ?? '')
const yearMax = ref<number | ''>(store.filter.yearMax ?? '')
const currentPage = ref(1)

const displayList = computed(() => {
  if (store.filteredMovies.length > VIRTUAL_THRESHOLD) {
    return store.filteredMovies
  }
  return store.filteredMovies
})

const totalPages = computed(() => Math.max(1, Math.ceil(displayList.value.length / PAGE_SIZE)))

const paginatedList = computed(() => {
  if (store.filteredMovies.length > VIRTUAL_THRESHOLD) {
    return store.filteredMovies
  }
  const start = (currentPage.value - 1) * PAGE_SIZE
  return displayList.value.slice(start, start + PAGE_SIZE)
})

const displayPageNumbers = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const pages: (number | string)[] = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }
  return pages
})

function handleSortChange() {
  store.setSort(sortValue.value)
}

function updateRatingRange() {
  const min = Math.min(ratingMin.value, ratingMax.value)
  const max = Math.max(ratingMin.value, ratingMax.value)
  ratingMin.value = min
  ratingMax.value = max
  store.setRatingRange(min, max)
  currentPage.value = 1
}

function updateYearRange() {
  const min = yearMin.value === '' ? null : Number(yearMin.value)
  const max = yearMax.value === '' ? null : Number(yearMax.value)
  if (min !== null && max !== null && min > max) {
    store.setYearRange(max, min)
  } else {
    store.setYearRange(min, max)
  }
  currentPage.value = 1
}

function resetAll() {
  store.resetFilter()
  sortValue.value = store.filter.sortKey
  ratingMin.value = store.filter.ratingMin
  ratingMax.value = store.filter.ratingMax
  yearMin.value = ''
  yearMax.value = ''
  currentPage.value = 1
}

function openEdit(movie: Movie) {
  emit('openEdit', movie)
}

watch(() => store.filteredMovies.length, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
  }
})
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.filter-bar {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group.right {
  margin-left: auto;
  flex-direction: row;
  align-items: flex-end;
  gap: 8px;
}

.filter-label {
  font-size: 12px;
  color: var(--text-muted);
}

.filter-select,
.filter-input {
  padding: 8px 12px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  transition: border-color 150ms ease;
  min-width: 120px;
}

.filter-select.small,
.filter-input.small {
  min-width: 80px;
}

.filter-select:focus,
.filter-input:focus {
  border-color: var(--accent);
}

.range-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.range-sep {
  color: var(--text-muted);
  font-size: 13px;
}

.active-tags-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.active-tags-label {
  font-size: 12px;
  color: var(--text-muted);
}

.active-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 10px 4px 12px;
  background-color: rgba(230, 137, 43, 0.2);
  color: var(--accent);
  border-radius: 14px;
  border: 1px solid rgba(230, 137, 43, 0.3);
  transition: all 150ms ease;
}

.active-tag:hover {
  background-color: rgba(248, 113, 113, 0.2);
  color: var(--danger);
  border-color: rgba(248, 113, 113, 0.3);
}

.active-tag .remove {
  font-size: 14px;
  line-height: 1;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  transition: all 150ms ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background-color: var(--accent);
  color: #1a1a2e;
  font-weight: 600;
}

.btn-primary:hover {
  background-color: var(--accent-hover);
}

.btn-ghost {
  background-color: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.btn-ghost:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-count {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.result-count .accent {
  color: var(--accent);
  font-size: 20px;
  font-weight: 700;
  margin: 0 4px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  color: var(--text-muted);
}

.empty-icon {
  margin-bottom: 20px;
  opacity: 0.3;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
}

.movie-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-btn {
  padding: 8px 14px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  transition: all 150ms ease;
  min-width: 36px;
}

.page-btn:hover:not(:disabled):not(.ellipsis) {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--accent);
}

.page-btn.active {
  background-color: var(--accent);
  color: #1a1a2e;
  border-color: var(--accent);
  font-weight: 600;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-btn.ellipsis {
  background: transparent;
  border: none;
  cursor: default;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 250ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .filter-row {
    gap: 12px;
  }

  .filter-group {
    flex: 1 1 45%;
  }

  .filter-group.right {
    flex: 1 1 100%;
    margin-left: 0;
    justify-content: flex-end;
  }

  .filter-select,
  .filter-input {
    min-width: 0;
    width: 100%;
  }

  .movie-grid {
    grid-template-columns: 1fr;
  }
}
</style>
