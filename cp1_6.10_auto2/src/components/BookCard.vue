<template>
  <router-link
    :to="`/book/${book.id}`"
    class="book-card"
  >
    <div class="cover-wrapper">
      <div v-if="book.cover" class="cover-image" :style="{ backgroundImage: `url(${book.cover})` }"></div>
      <div v-else class="cover-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span class="cover-title">{{ book.title.charAt(0) }}</span>
      </div>
      <div class="tag-dots">
        <span
          v-for="tag in displayTags"
          :key="tag.id"
          class="tag-dot"
          :style="{ backgroundColor: tag.color }"
          :title="tag.name"
        ></span>
      </div>
    </div>

    <div class="book-info">
      <h3 class="book-title" :title="book.title">{{ book.title }}</h3>
      <p class="book-author">{{ book.author }}</p>

      <div class="progress-section">
        <div class="progress-header">
          <span class="progress-label">阅读进度</span>
          <span class="progress-value" :class="{ 'progress-complete': book.progress === 100 }">
            {{ book.progress }}%
          </span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${book.progress}%` }"
            :class="{ 'progress-fill-complete': book.progress === 100 }"
          ></div>
        </div>
      </div>
    </div>
  </router-link>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBookStore, type Book } from '@/stores/bookStore'

const props = defineProps<{
  book: Book
}>()

const bookStore = useBookStore()

const displayTags = computed(() => {
  return props.book.tags
    .map(tagId => bookStore.getTagById(tagId))
    .filter(Boolean)
    .slice(0, 3)
})
</script>

<style scoped>
.book-card {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: var(--transition);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  height: 100%;
}

.book-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-lg);
}

.cover-wrapper {
  position: relative;
  width: 100%;
  padding-top: 140%;
  background: var(--gradient-primary);
  overflow: hidden;
}

.cover-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}

.cover-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
}

.cover-placeholder svg {
  width: 48px;
  height: 48px;
}

.cover-title {
  margin-top: 8px;
  font-size: 36px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
}

.tag-dots {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 4px;
}

.tag-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  border: 1.5px solid rgba(255, 255, 255, 0.9);
}

.book-info {
  padding: 14px 16px 18px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.book-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-author {
  font-size: 13px;
  color: var(--color-text-light);
  margin-bottom: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-section {
  margin-top: auto;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.progress-label {
  font-size: 12px;
  color: var(--color-text-light);
}

.progress-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
}

.progress-value.progress-complete {
  color: #38a169;
}

.progress-bar {
  height: 6px;
  background: #edf2f7;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--gradient-accent);
  border-radius: 3px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-fill-complete {
  background: linear-gradient(90deg, #38a169 0%, #48bb78 100%);
}
</style>
