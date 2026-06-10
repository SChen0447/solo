<template>
  <div class="home-view">
    <div class="view-header">
      <div class="header-content">
        <div>
          <h1 class="page-title">{{ currentCategory?.icon || '📚' }} {{ currentCategoryName }}</h1>
          <p class="page-subtitle">共 {{ filteredBooks.length }} 本书籍</p>
        </div>
        <SearchBar
          v-model="searchQuery"
          :placeholder="'搜索书名、作者或标签...'"
          :result-count="searchQuery ? searchResultCount : -1"
        />
      </div>
    </div>

    <transition name="fade" mode="out-in">
      <div v-if="filteredBooks.length === 0" key="empty" class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3 class="empty-title">没有找到相关书籍</h3>
        <p class="empty-desc">
          {{ searchQuery ? '试试其他关键词，或者清除搜索条件' : '这个分类下还没有书籍' }}
        </p>
        <button
          v-if="searchQuery"
          class="clear-search-btn"
          @click="clearSearch"
          type="button"
        >
          清除搜索
        </button>
      </div>

      <div v-else key="grid" class="books-grid">
        <transition-group name="list" tag="div" class="grid-inner">
          <BookCard
            v-for="book in filteredBooks"
            :key="book.id"
            :book="book"
          />
        </transition-group>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBookStore } from '@/stores/bookStore'
import SearchBar from '@/components/SearchBar.vue'
import BookCard from '@/components/BookCard.vue'

const bookStore = useBookStore()

const searchQuery = computed({
  get: () => bookStore.searchQuery,
  set: (value: string) => bookStore.setSearchQuery(value)
})

const filteredBooks = computed(() => bookStore.filteredBooks)
const searchResultCount = computed(() => bookStore.searchResultCount)

const currentCategory = computed(() => {
  if (bookStore.selectedCategoryId === 'all') {
    return { icon: '📚', name: '全部书籍' }
  }
  return bookStore.getCategoryById(bookStore.selectedCategoryId)
})

const currentCategoryName = computed(() => {
  return currentCategory.value?.name || '全部书籍'
})

const clearSearch = () => {
  bookStore.setSearchQuery('')
}
</script>

<style scoped>
.home-view {
  height: 100%;
}

.view-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-light);
}

.books-grid {
  width: 100%;
}

.grid-inner {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: var(--color-text-light);
  margin-bottom: 20px;
}

.clear-search-btn {
  padding: 10px 24px;
  background: var(--gradient-primary);
  color: white;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  transition: var(--transition);
}

.clear-search-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.list-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.list-move {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (max-width: 480px) {
  .grid-inner {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }

  .page-title {
    font-size: 22px;
  }

  .header-content {
    gap: 16px;
  }
}
</style>
