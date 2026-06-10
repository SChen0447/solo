<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCollectionStore } from '@/store/useCollection'
import { EditionColors, EditionLabels, StatusColors, StatusLabels } from '@/数据类型/types'
import type { VinylRecord } from '@/数据类型/types'

const emit = defineEmits<{
  (e: 'showDetail', record: VinylRecord): void
}>()

const store = useCollectionStore()
const animatingRecordIds = ref<Set<string>>(new Set())

const handleFavoriteClick = (e: MouseEvent, recordId: string) => {
  e.stopPropagation()
  animatingRecordIds.value.add(recordId)
  store.toggleFavorite(recordId)
  setTimeout(() => {
    animatingRecordIds.value.delete(recordId)
  }, 200)
}

const handleCardClick = (record: VinylRecord) => {
  emit('showDetail', record)
}

const isHighlighted = (recordId: string) => {
  return store.highlightedRecordId === recordId
}

const isAnimating = (recordId: string) => {
  return animatingRecordIds.value.has(recordId)
}
</script>

<template>
  <div class="card-grid">
    <TransitionGroup name="card" tag="div" class="grid-inner">
      <div
        v-for="record in store.filteredRecords"
        :key="record.id"
        class="card-item"
        :class="{ 'card-highlighted': isHighlighted(record.id) }"
        @click="handleCardClick(record)"
      >
        <div class="card-cover">
          <img :src="record.coverImage" :alt="record.name" />
          <div class="card-hover-overlay"></div>
        </div>
        <div class="card-info">
          <div class="card-header">
            <span class="status-dot" :style="{ backgroundColor: StatusColors[record.status] }"></span>
            <span class="status-label">{{ StatusLabels[record.status] }}</span>
            <span class="edition-tag" :style="{ backgroundColor: EditionColors[record.edition] }">
              {{ EditionLabels[record.edition] }}
            </span>
          </div>
          <h3 class="card-name">{{ record.name }}</h3>
          <p class="card-artist">{{ record.artist }} · {{ record.year }}</p>
        </div>
        <button
          class="favorite-btn"
          :class="{ 'is-favorite': store.isFavorite(record.id), 'is-animating': isAnimating(record.id) }"
          @click="handleFavoriteClick($event, record.id)"
        >
          <svg v-if="store.isFavorite(record.id)" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.card-grid {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  scrollbar-width: thin;
  scrollbar-color: #8d6e63 #f5f0e8;
}

.card-grid::-webkit-scrollbar {
  width: 8px;
}

.card-grid::-webkit-scrollbar-track {
  background: #f5f0e8;
}

.card-grid::-webkit-scrollbar-thumb {
  background: #8d6e63;
  border-radius: 4px;
}

.grid-inner {
  display: grid;
  grid-template-columns: repeat(3, 280px);
  gap: 24px;
  justify-content: center;
}

.card-item {
  width: 280px;
  background-color: #f5f0e8;
  border-radius: 10px;
  box-shadow: 0 2px 8px #ccc;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
  will-change: transform, box-shadow;
}

.card-item:hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 20px #999;
}

.card-item:hover .card-hover-overlay {
  opacity: 1;
}

.card-highlighted {
  box-shadow: 0 0 0 3px #e76f51, 0 8px 20px #999;
  transform: translateY(-6px);
}

.card-cover {
  width: 100%;
  height: 280px;
  position: relative;
  overflow: hidden;
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.card-hover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(245, 200, 120, 0.15);
  opacity: 0;
  transition: opacity 0.3s ease-out;
  pointer-events: none;
}

.card-info {
  padding: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-label {
  font-size: 12px;
  color: #5d4037;
  font-weight: 500;
}

.edition-tag {
  padding: 2px 10px;
  border-radius: 12px;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  margin-left: auto;
}

.card-name {
  font-size: 16px;
  font-weight: 600;
  color: #3d2b1f;
  margin: 0 0 6px 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-artist {
  font-size: 13px;
  color: #6d4c41;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.favorite-btn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: transform 0.2s ease-out;
  color: #ccc;
}

.favorite-btn svg {
  width: 18px;
  height: 18px;
}

.favorite-btn.is-favorite {
  color: #e63946;
}

.favorite-btn.is-animating {
  animation: heartBeat 0.2s ease-out;
}

@keyframes heartBeat {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}

.card-enter-active,
.card-leave-active {
  transition: opacity 0.4s ease-out, transform 0.4s ease-out;
}

.card-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.card-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.new-card-enter-active {
  animation: popIn 0.5s ease-out;
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  70% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@media (max-width: 768px) {
  .card-grid {
    padding: 16px;
  }

  .grid-inner {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .card-item {
    width: 100%;
  }

  .card-cover {
    height: 0;
    padding-bottom: 100%;
  }

  .card-cover img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}
</style>
