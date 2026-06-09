<template>
  <div class="card-wall">
    <div class="search-bar">
      <div class="search-wrapper" :class="{ focused: isSearchFocused, filled: searchKeyword }">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索诗名或作者..."
          @focus="isSearchFocused = true"
          @blur="isSearchFocused = false"
        />
        <button
          v-if="searchKeyword"
          class="clear-btn"
          @click="searchKeyword = ''"
        >
          ✕
        </button>
        <span class="search-underline"></span>
      </div>

      <button
        class="filter-btn"
        :class="{ active: showFavoritesOnly }"
        @click="showFavoritesOnly = !showFavoritesOnly"
      >
        <span class="filter-star">{{ showFavoritesOnly ? '★' : '☆' }}</span>
        {{ showFavoritesOnly ? '显示全部' : '只看收藏' }}
      </button>
    </div>

    <div v-if="filteredPoems.length === 0" class="empty-state">
      <svg class="empty-illustration" viewBox="0 0 200 180">
        <ellipse cx="100" cy="160" rx="50" ry="8" fill="#8B5E3C" opacity="0.1"/>
        <rect x="55" y="60" width="90" height="90" rx="8" fill="#FFFBF5" stroke="#D4A574" stroke-width="2"/>
        <rect x="55" y="60" width="90" height="15" rx="8" fill="#FAD0C4"/>
        <circle cx="100" cy="110" r="22" fill="#FFF5E6" stroke="#D4A574" stroke-width="1.5"/>
        <circle cx="92" cy="106" r="2.5" fill="#8B5E3C"/>
        <circle cx="108" cy="106" r="2.5" fill="#8B5E3C"/>
        <path d="M88,118 Q100,128 112,118" stroke="#8B5E3C" stroke-width="2" fill="none" stroke-linecap="round"/>
        <ellipse cx="85" cy="114" rx="5" ry="3" fill="#FAD0C4" opacity="0.6"/>
        <ellipse cx="115" cy="114" rx="5" ry="3" fill="#FAD0C4" opacity="0.6"/>
        <path d="M60,50 Q65,40 75,45" stroke="#D4A574" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M125,45 Q135,40 140,50" stroke="#D4A574" stroke-width="2" fill="none" stroke-linecap="round"/>
        <text x="100" y="175" text-anchor="middle" fill="#8B5E3C" font-size="12" font-family="KaiTi, serif">暂时找不到哦~</text>
      </svg>
      <p class="empty-text">换个关键词试试？</p>
    </div>

    <div v-else class="card-grid">
      <PoemCard
        v-for="(poem, index) in filteredPoems"
        :key="poem.id"
        :poem="poem"
        :index="index"
        :delay="index * 60"
        :isFavorite="favorites.has(poem.id)"
        class="card-stagger"
        @toggleFavorite="toggleFavorite"
        @view="markViewed"
      />
    </div>

    <div class="stats-bar glass">
      <div class="stat-item">
        <span class="stat-icon">📚</span>
        <span class="stat-label">可见</span>
        <span class="stat-value">{{ filteredPoems.length }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-icon">⭐</span>
        <span class="stat-label">收藏</span>
        <span class="stat-value">{{ favorites.size }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-icon">👁️</span>
        <span class="stat-label">浏览</span>
        <span class="stat-value">{{ viewed.size }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import PoemCard from '../components/PoemCard.vue'
import { poems, shuffleArray } from '../utils/poemData'

const searchKeyword = ref('')
const isSearchFocused = ref(false)
const showFavoritesOnly = ref(false)
const shuffledPoems = ref(poems)

const favorites = ref<Set<number>>(new Set())
const viewed = ref<Set<number>>(new Set())

onMounted(() => {
  shuffledPoems.value = shuffleArray(poems)
  loadFromStorage()
})

const filteredPoems = computed(() => {
  let result = shuffledPoems.value
  if (showFavoritesOnly.value) {
    result = result.filter(p => favorites.value.has(p.id))
  }
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    result = result.filter(p =>
      p.title.toLowerCase().includes(keyword) ||
      p.author.toLowerCase().includes(keyword)
    )
  }
  return result
})

function toggleFavorite(id: number) {
  if (favorites.value.has(id)) {
    favorites.value.delete(id)
  } else {
    favorites.value.add(id)
  }
  favorites.value = new Set(favorites.value)
  saveToStorage()
}

function markViewed(id: number) {
  if (!viewed.value.has(id)) {
    viewed.value.add(id)
    viewed.value = new Set(viewed.value)
    saveToStorage()
  }
}

function saveToStorage() {
  try {
    localStorage.setItem('poem_favorites', JSON.stringify([...favorites.value]))
    localStorage.setItem('poem_viewed', JSON.stringify([...viewed.value]))
  } catch (e) {
    console.warn('无法保存到 localStorage:', e)
  }
}

function loadFromStorage() {
  try {
    const favData = localStorage.getItem('poem_favorites')
    if (favData) {
      favorites.value = new Set(JSON.parse(favData))
    }
    const viewData = localStorage.getItem('poem_viewed')
    if (viewData) {
      viewed.value = new Set(JSON.parse(viewData))
    }
  } catch (e) {
    console.warn('无法从 localStorage 读取:', e)
  }
}
</script>

<style scoped>
.card-wall {
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 20px;
}

.search-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
  width: 340px;
  max-width: 100%;
}

.search-icon {
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1rem;
  opacity: 0.5;
  transition: opacity 0.3s ease;
  z-index: 1;
}

.search-wrapper.focused .search-icon,
.search-wrapper.filled .search-icon {
  opacity: 1;
  color: var(--text-primary);
}

.search-input {
  width: 100%;
  padding: 10px 36px 10px 32px;
  border: none;
  background: transparent;
  font-size: 1.05rem;
  font-family: inherit;
  color: var(--text-primary);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.search-underline {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  width: 0;
  background: linear-gradient(90deg, var(--gold), var(--text-primary));
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 2px;
}

.search-wrapper.focused .search-underline {
  width: 100%;
}

.search-wrapper::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  height: 1px;
  width: 100%;
  background: var(--gold);
  opacity: 0.35;
  border-radius: 1px;
}

.clear-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(139, 94, 60, 0.1);
  color: var(--text-secondary);
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
}

.clear-btn:hover {
  background: rgba(139, 94, 60, 0.2);
  color: var(--text-primary);
  transform: translateY(-50%) scale(1.1);
}

.filter-btn {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid var(--gold);
  border-radius: 24px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.filter-btn:hover {
  background: rgba(212, 165, 116, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--shadow-light);
}

.filter-btn.active {
  background: linear-gradient(135deg, var(--card-gradient-start), var(--card-gradient-end));
  border-color: var(--gold-dark);
}

.filter-star {
  font-size: 1rem;
}

.filter-btn.active .filter-star {
  color: var(--gold-dark);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-illustration {
  width: 220px;
  height: 200px;
  margin-bottom: 20px;
}

.empty-text {
  font-size: 1.1rem;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

@media (max-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  .search-bar {
    gap: 12px;
    margin-bottom: 24px;
  }
  .search-wrapper {
    width: 100%;
    max-width: 340px;
  }
}

@media (max-width: 480px) {
  .card-grid {
    gap: 12px;
  }
}

.stats-bar {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 28px;
  border-radius: 28px;
  z-index: 100;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-icon {
  font-size: 1rem;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 24px;
  text-align: center;
}

.stat-divider {
  width: 1px;
  height: 20px;
  background: var(--gold);
  opacity: 0.3;
}

@media (max-width: 480px) {
  .stats-bar {
    gap: 14px;
    padding: 10px 18px;
    bottom: 10px;
  }
  .stat-item {
    gap: 4px;
  }
  .stat-label {
    font-size: 0.8rem;
  }
  .stat-value {
    font-size: 1rem;
    min-width: 18px;
  }
}
</style>
