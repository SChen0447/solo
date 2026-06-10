<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { UserChoice } from '@/types'
import { MOVIES } from '@/data/movies'

const props = defineProps<{
  choicesCount: number
}>()

const emit = defineEmits<{
  choice: [payload: UserChoice]
}>()

const MOVIES_PER_BATCH = 2
const TOTAL_BATCHES = MOVIES.length / MOVIES_PER_BATCH

const currentBatchIndex = computed(() => Math.floor(props.choicesCount / MOVIES_PER_BATCH))
const localIndex = computed(() => props.choicesCount % MOVIES_PER_BATCH)

const currentBatch = computed(() => {
  const start = currentBatchIndex.value * MOVIES_PER_BATCH
  return MOVIES.slice(start, start + MOVIES_PER_BATCH)
})

const fadingCards = ref<Set<number>>(new Set())
const transitioningBatch = ref(false)

watch(currentBatchIndex, () => {
  transitioningBatch.value = true
  setTimeout(() => {
    transitioningBatch.value = false
  }, 400)
})

function handleChoice(movieId: number, liked: boolean) {
  fadingCards.value.add(movieId)

  setTimeout(() => {
    emit('choice', { movieId, liked })
    fadingCards.value.delete(movieId)
  }, 300)
}

function isCardVisible(movie: typeof MOVIES[number]) {
  const movieIndex = MOVIES.findIndex((m) => m.id === movie.id)
  const processedCount = props.choicesCount
  if (movieIndex < processedCount) return false
  if (transitioningBatch.value && movieIndex === currentBatch.value[0]?.id - 1) return false
  return true
}
</script>

<template>
  <div class="test-panel">
    <div class="cards-grid">
      <div
        v-for="movie in currentBatch"
        :key="movie.id"
        class="movie-card"
        :class="{
          'fade-out': fadingCards.has(movie.id),
          'card-hidden': !isCardVisible(movie)
        }"
      >
        <div class="card-thumbnail" :style="{ background: movie.gradient }">
          <span class="thumbnail-text">{{ movie.title.slice(0, 2) }}</span>
        </div>
        <div class="card-info">
          <h3 class="card-title">{{ movie.title }}</h3>
          <p class="card-year">{{ movie.year }}</p>
        </div>
        <div class="card-actions">
          <button
            class="action-btn dislike-btn"
            title="不喜欢"
            @click="handleChoice(movie.id, false)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <button
            class="action-btn like-btn"
            title="喜欢"
            @click="handleChoice(movie.id, true)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
    <div class="batch-indicator">
      第 {{ Math.min(currentBatchIndex + 1, TOTAL_BATCHES) }} / {{ TOTAL_BATCHES }} 组
    </div>
  </div>
</template>

<style scoped>
.test-panel {
  width: 100%;
  max-width: 540px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 220px);
  gap: 24px;
  margin-bottom: 24px;
}

.movie-card {
  background-color: #2d3436;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease, opacity 0.3s ease;
  opacity: 1;
  transform: translateY(0) scale(1);
}

.movie-card:hover {
  transform: scale(1.05);
}

.movie-card.fade-out {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.movie-card.card-hidden {
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
}

.card-thumbnail {
  width: 100%;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.thumbnail-text {
  font-size: 48px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.card-info {
  padding: 16px;
  text-align: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #dcdde1;
  margin-bottom: 4px;
}

.card-year {
  font-size: 12px;
  color: #7f8c8d;
}

.card-actions {
  display: flex;
  justify-content: space-around;
  padding: 0 16px 16px;
  gap: 12px;
}

.action-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-btn:active {
  transform: scale(0.9);
}

.like-btn {
  background-color: #27ae60;
  color: white;
}

.like-btn:hover {
  background-color: #2ecc71;
  box-shadow: 0 0 16px rgba(39, 174, 96, 0.6);
}

.dislike-btn {
  background-color: #e74c3c;
  color: white;
}

.dislike-btn:hover {
  background-color: #c0392b;
  box-shadow: 0 0 16px rgba(231, 76, 60, 0.5);
}

.batch-indicator {
  font-size: 13px;
  color: #7f8c8d;
}

@media (max-width: 768px) {
  .cards-grid {
    grid-template-columns: 220px;
    gap: 16px;
  }
}
</style>
