<template>
  <div class="book-list-page">
    <section class="stats-panel">
      <div class="stat-card float-card">
        <span class="stat-icon">📦</span>
        <div class="stat-info">
          <span class="stat-value">{{ store.totalStock }}</span>
          <span class="stat-label">总库存</span>
        </div>
      </div>
      <div class="stat-card float-card">
        <span class="stat-icon">⚠️</span>
        <div class="stat-info">
          <span class="stat-value out">{{ store.outOfStockCount }}</span>
          <span class="stat-label">缺货书籍</span>
        </div>
      </div>
      <div class="stat-card float-card">
        <span class="stat-icon">📋</span>
        <div class="stat-info">
          <span class="stat-value list">{{ store.readingListCount }}</span>
          <span class="stat-label">我的清单</span>
        </div>
      </div>
    </section>

    <section class="search-section">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          :value="store.searchKeyword"
          @input="handleSearch"
          placeholder="搜索书名或作者..."
          class="search-input"
        />
      </div>
    </section>

    <section class="category-section">
      <button
        v-for="cat in categories"
        :key="cat"
        class="category-btn"
        :class="{ active: store.activeCategory === cat }"
        @click="store.setActiveCategory(cat)"
      >
        {{ cat }}
      </button>
    </section>

    <section class="books-section">
      <div v-if="store.loading" class="loading">
        <span class="loading-spinner"></span>
        <span>加载中...</span>
      </div>
      <div v-else-if="store.filteredBooks.length === 0" class="empty">
        <span class="empty-icon">📭</span>
        <p>没有找到符合条件的书籍</p>
      </div>
      <div v-else class="books-grid">
        <article
          v-for="book in store.filteredBooks"
          :key="book.id"
          class="book-card"
        >
          <div class="book-cover">{{ book.cover }}</div>
          <div class="book-info">
            <h3 class="book-title" :title="book.title">{{ book.title }}</h3>
            <p class="book-author">{{ book.author }}</p>
            <span class="book-category">{{ book.category }}</span>
            <div class="book-stock-row">
              <span
                class="stock-num"
                :class="{
                  flashing: store.flashingStockIds.has(book.id),
                  'out-of-stock': book.stock === 0
                }"
              >
                库存: {{ book.stock }}
              </span>
              <span v-if="book.stock === 0" class="out-tag">缺货</span>
            </div>
          </div>
          <button
            class="add-btn"
            :class="{
              added: store.isInReadingList(book.id),
              disabled: book.stock === 0
            }"
            :disabled="store.isInReadingList(book.id) || book.stock === 0"
            @click="store.addToReadingList(book.id)"
          >
            {{
              store.isInReadingList(book.id)
                ? '✓ 已加入'
                : book.stock === 0
                ? '暂不可加'
                : '+ 加入清单'
            }}
          </button>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useBookStore } from '../store'
import { getCategories } from '../api'
import type { Category } from '../api'

const store = useBookStore()
const categories: Category[] = getCategories()

function handleSearch(e: Event) {
  const target = e.target as HTMLInputElement
  store.setSearchKeyword(target.value)
}
</script>

<style scoped>
.stats-panel {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 2px 10px rgba(107, 68, 35, 0.08);
  border: 1px solid #f0e6d4;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(107, 68, 35, 0.14);
}

.float-card {
  animation: floatUp 0.6s ease;
}

@keyframes floatUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stat-icon {
  font-size: 32px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #4a7c59;
  line-height: 1.1;
}

.stat-value.out {
  color: #c0392b;
}

.stat-value.list {
  color: #e67e22;
}

.stat-label {
  font-size: 13px;
  color: #8b7355;
  margin-top: 2px;
}

.search-section {
  margin-bottom: 18px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 16px;
  color: #8b7355;
  font-size: 16px;
  pointer-events: none;
  transition: color 0.25s ease;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  font-size: 15px;
  border: none;
  border-bottom: 2px solid #d4c4a8;
  background: transparent;
  color: #3d2c1e;
  outline: none;
  transition: border-color 0.3s ease, padding 0.3s ease;
  font-family: inherit;
}

.search-input::placeholder {
  color: #b8a485;
}

.search-input:focus {
  border-bottom-color: #4a7c59;
  padding-bottom: 16px;
}

.search-input:focus + .search-icon,
.search-box:focus-within .search-icon {
  color: #4a7c59;
}

.category-section {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.category-btn {
  padding: 8px 18px;
  border: 1.5px solid #d4c4a8;
  background: #fff;
  color: #6b4423;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
  font-weight: 500;
}

.category-btn:hover {
  border-color: #4a7c59;
  color: #4a7c59;
  background: rgba(74, 124, 89, 0.06);
}

.category-btn.active {
  background: #4a7c59;
  border-color: #4a7c59;
  color: #fff;
}

.books-section {
  min-height: 200px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 0;
  color: #8b7355;
  font-size: 15px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2.5px solid #d4c4a8;
  border-top-color: #4a7c59;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty {
  text-align: center;
  padding: 60px 20px;
  color: #8b7355;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}

.book-card {
  background: #fff;
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 2px 10px rgba(107, 68, 35, 0.06);
  border: 1px solid #f0e6d4;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.book-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(107, 68, 35, 0.12);
}

.book-cover {
  font-size: 52px;
  text-align: center;
  padding: 14px 0;
  background: linear-gradient(135deg, #faf6ef 0%, #f0e6d4 100%);
  border-radius: 10px;
}

.book-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.book-title {
  font-size: 16px;
  font-weight: 600;
  color: #3d2c1e;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-author {
  font-size: 13px;
  color: #8b7355;
}

.book-category {
  display: inline-block;
  font-size: 12px;
  color: #6b4423;
  background: #f5ead4;
  padding: 3px 10px;
  border-radius: 6px;
  align-self: flex-start;
  margin-top: 2px;
}

.book-stock-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.stock-num {
  font-size: 13px;
  color: #4a7c59;
  font-weight: 600;
  transition: all 0.3s ease;
  padding: 2px 6px;
  border-radius: 4px;
}

.stock-num.out-of-stock {
  color: #c0392b;
}

.stock-num.flashing {
  background: #ffd93d;
  color: #6b4423;
  animation: flash 0.3s ease;
}

@keyframes flash {
  0%,
  100% {
    background: transparent;
  }
  50% {
    background: #ffd93d;
  }
}

.out-tag {
  font-size: 11px;
  background: #c0392b;
  color: #fff;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
}

.add-btn {
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: #4a7c59;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.add-btn:hover:not(.disabled):not(.added) {
  background: #3d6b4a;
  transform: translateY(-1px);
}

.add-btn.added {
  background: #d4c4a8;
  color: #6b4423;
  cursor: default;
}

.add-btn.disabled {
  background: #e0d5c1;
  color: #a89375;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .stats-panel {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 18px;
  }

  .stat-card {
    padding: 12px 10px;
    flex-direction: column;
    gap: 6px;
    text-align: center;
  }

  .stat-icon {
    font-size: 26px;
  }

  .stat-value {
    font-size: 22px;
  }

  .stat-label {
    font-size: 12px;
  }

  .books-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .category-btn {
    padding: 7px 14px;
    font-size: 13px;
  }
}
</style>
