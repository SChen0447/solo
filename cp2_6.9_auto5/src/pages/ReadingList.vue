<template>
  <div class="reading-list-page">
    <div class="page-header">
      <h2 class="page-title">📋 我的阅读清单</h2>
      <p v-if="store.readingListBooks.length > 0" class="page-subtitle">
        已收藏 {{ store.readingListBooks.length }} 本书
      </p>
    </div>

    <div v-if="store.readingListBooks.length === 0" class="empty-state">
      <span class="empty-icon">📚</span>
      <h3 class="empty-title">阅读清单还是空的</h3>
      <p class="empty-desc">去书籍浏览页挑选一些感兴趣的书吧～</p>
      <router-link to="/" class="go-btn">去逛逛</router-link>
    </div>

    <ul v-else class="reading-list">
      <li
        v-for="(book, index) in store.readingListBooks"
        :key="book.id"
        class="reading-item"
        :style="{ animationDelay: `${index * 60}ms` }"
      >
        <span class="item-cover">{{ book.cover }}</span>
        <div class="item-info">
          <h4 class="item-title">{{ book.title }}</h4>
          <p class="item-author">{{ book.author }}</p>
          <div class="item-meta">
            <span class="item-category">{{ book.category }}</span>
            <span
              class="item-stock"
              :class="{ out: book.stock === 0 }"
            >
              {{ book.stock > 0 ? `库存: ${book.stock}` : '已缺货' }}
            </span>
          </div>
        </div>
        <button
          class="remove-btn"
          @click="handleRemove(book.id)"
          title="移出清单"
        >
          ✕
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useBookStore } from '../store'

const store = useBookStore()

function handleRemove(bookId: number) {
  store.removeFromReadingList(bookId)
}
</script>

<style scoped>
.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #3d2c1e;
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 14px;
  color: #8b7355;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #f0e6d4;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #3d2c1e;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: #8b7355;
  margin-bottom: 24px;
}

.go-btn {
  display: inline-block;
  padding: 10px 28px;
  background: #4a7c59;
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.25s ease;
}

.go-btn:hover {
  background: #3d6b4a;
  transform: translateY(-2px);
}

.reading-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reading-item {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid #f0e6d4;
  box-shadow: 0 2px 8px rgba(107, 68, 35, 0.05);
  animation: slideIn 0.4s ease both;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.reading-item:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 14px rgba(107, 68, 35, 0.1);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.item-cover {
  font-size: 40px;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #faf6ef 0%, #f0e6d4 100%);
  border-radius: 10px;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 15px;
  font-weight: 600;
  color: #3d2c1e;
  margin-bottom: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-author {
  font-size: 13px;
  color: #8b7355;
  margin-bottom: 6px;
}

.item-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.item-category {
  font-size: 11px;
  color: #6b4423;
  background: #f5ead4;
  padding: 2px 8px;
  border-radius: 5px;
}

.item-stock {
  font-size: 12px;
  color: #4a7c59;
  font-weight: 500;
}

.item-stock.out {
  color: #c0392b;
}

.remove-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #f5ead4;
  color: #8b7355;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  background: #fde8e8;
  color: #c0392b;
}

@media (max-width: 768px) {
  .item-cover {
    font-size: 32px;
    width: 48px;
    height: 48px;
  }

  .reading-item {
    gap: 12px;
    padding: 12px 14px;
  }

  .empty-state {
    padding: 60px 16px;
  }
}
</style>
