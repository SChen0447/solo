<template>
  <div class="movie-card" @click="$emit('click', movie)">
    <div class="card-header">
      <h3 class="card-title">{{ movie.title }}</h3>
      <span class="card-year">{{ movie.year }}</span>
    </div>

    <div class="rating-section">
      <div class="rating-label">
        <span>评分</span>
        <span class="rating-value">{{ movie.rating }}/10</span>
      </div>
      <div class="rating-bar">
        <div
          class="rating-fill"
          :style="{ width: (movie.rating * 10) + '%' }"
        ></div>
      </div>
    </div>

    <div class="card-footer">
      <div class="tags-wrapper">
        <span
          v-for="tag in movie.tags"
          :key="tag"
          class="tag-badge"
        >{{ tag }}</span>
        <span v-if="movie.tags.length === 0" class="no-tags">暂无标签</span>
      </div>
      <span class="watch-date">{{ formatDate(movie.watchDate) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Movie } from '@/types'

defineProps<{
  movie: Movie
}>()

defineEmits<{
  (e: 'click', movie: Movie): void
}>()

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.movie-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: transform 200ms ease, box-shadow 200ms ease;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.movie-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
  border-color: var(--accent);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  word-break: break-word;
}

.card-year {
  font-size: 13px;
  color: var(--text-muted);
  background-color: var(--bg-tertiary);
  padding: 2px 10px;
  border-radius: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.rating-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rating-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--text-secondary);
}

.rating-value {
  color: var(--accent);
  font-weight: 600;
  font-size: 14px;
}

.rating-bar {
  height: 6px;
  background-color: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.rating-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-hover));
  border-radius: 3px;
  transition: width 300ms ease;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: auto;
}

.tags-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.tag-badge {
  font-size: 12px;
  padding: 3px 10px;
  background-color: rgba(230, 137, 43, 0.15);
  color: var(--accent);
  border-radius: 12px;
  border: 1px solid rgba(230, 137, 43, 0.3);
}

.no-tags {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
}

.watch-date {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
