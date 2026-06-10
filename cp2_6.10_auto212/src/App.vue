<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCollectionStore } from '@/store/useCollection'
import { EditionColors, EditionLabels, StatusColors, StatusLabels } from '@/数据类型/types'
import type { VinylRecord } from '@/数据类型/types'
import CardGrid from '@/组件/CardGrid.vue'
import PublishModal from '@/组件/PublishModal.vue'
import { debounce } from 'lodash'

const store = useCollectionStore()

const searchInput = ref('')
const isPublishModalOpen = ref(false)
const isDetailPanelOpen = ref(false)
const isFavoriteSidebarOpen = ref(false)
const selectedRecord = ref<VinylRecord | null>(null)
const isSearchFocused = ref(false)

const debouncedSearch = debounce((value: string) => {
  store.setSearchKeyword(value)
}, 200)

watch(searchInput, (newVal) => {
  debouncedSearch(newVal)
})

const handleShowDetail = (record: VinylRecord) => {
  selectedRecord.value = record
  isDetailPanelOpen.value = true
}

const handleCloseDetail = () => {
  isDetailPanelOpen.value = false
  selectedRecord.value = null
}

const handleOpenPublish = () => {
  isPublishModalOpen.value = true
}

const handleClosePublish = () => {
  isPublishModalOpen.value = false
}

const handleToggleFavoriteSidebar = () => {
  isFavoriteSidebarOpen.value = !isFavoriteSidebarOpen.value
}

const handleFavoriteItemClick = (record: VinylRecord) => {
  store.setHighlightedRecord(record.id)
  setTimeout(() => {
    store.setHighlightedRecord(null)
  }, 2000)
}
</script>

<template>
  <div class="app-container">
    <nav class="navbar">
      <div class="navbar-left">
        <button class="favorites-toggle" @click="handleToggleFavoriteSidebar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span v-if="store.favorites.length > 0" class="fav-count">{{ store.favorites.length }}</span>
        </button>
        <div class="search-wrapper" :class="{ 'is-focused': isSearchFocused }">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            v-model="searchInput"
            type="text"
            class="search-input"
            placeholder="搜索唱片或艺术家..."
            @focus="isSearchFocused = true"
            @blur="isSearchFocused = false"
          />
        </div>
      </div>
      <h1 class="navbar-title">黑胶唱片收藏</h1>
      <div class="navbar-right"></div>
    </nav>

    <div class="main-content">
      <Transition name="sidebar-left">
        <aside v-if="isFavoriteSidebarOpen" class="favorite-sidebar">
          <div class="sidebar-header">
            <h3>我的收藏</h3>
            <button class="sidebar-close" @click="handleToggleFavoriteSidebar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="sidebar-content">
            <div v-if="store.favoriteRecords.length === 0" class="empty-favorites">
              <p>暂无收藏的唱片</p>
            </div>
            <div
              v-for="record in store.favoriteRecords"
              :key="record.id"
              class="favorite-item"
              @click="handleFavoriteItemClick(record)"
            >
              <img :src="record.coverImage" :alt="record.name" class="favorite-thumb" />
              <div class="favorite-info">
                <p class="favorite-name">{{ record.name }}</p>
                <p class="favorite-artist">{{ record.artist }}</p>
              </div>
            </div>
          </div>
        </aside>
      </Transition>

      <div class="content-area">
        <CardGrid @show-detail="handleShowDetail" />
      </div>

      <Transition name="sidebar-right">
        <aside v-if="isDetailPanelOpen && selectedRecord" class="detail-panel">
          <button class="detail-close" @click="handleCloseDetail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
          <div class="detail-cover">
            <img :src="selectedRecord.coverImage" :alt="selectedRecord.name" />
          </div>
          <div class="detail-content">
            <div class="detail-tags">
              <span
                class="edition-tag"
                :style="{ backgroundColor: EditionColors[selectedRecord.edition] }"
              >
                {{ EditionLabels[selectedRecord.edition] }}
              </span>
              <span class="status-badge">
                <span
                  class="status-dot"
                  :style="{ backgroundColor: StatusColors[selectedRecord.status] }"
                ></span>
                {{ StatusLabels[selectedRecord.status] }}
              </span>
            </div>
            <h2 class="detail-name">{{ selectedRecord.name }}</h2>
            <p class="detail-artist">{{ selectedRecord.artist }}</p>
            <p class="detail-year">发行年份：{{ selectedRecord.year }}</p>
            <div class="detail-section">
              <h4>联系方式</h4>
              <p class="detail-phone">{{ selectedRecord.sellerPhone }}</p>
            </div>
            <div class="detail-section">
              <h4>收藏故事</h4>
              <p class="detail-story">{{ selectedRecord.story }}</p>
            </div>
          </div>
        </aside>
      </Transition>
    </div>

    <button class="fab-btn" @click="handleOpenPublish">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </button>

    <Transition name="modal">
      <PublishModal v-if="isPublishModalOpen" @close="handleClosePublish" />
    </Transition>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f0e8;
}

.navbar {
  height: 56px;
  background-color: #3d2b1f;
  color: #f5e6c8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}

.navbar-left,
.navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 240px;
}

.navbar-right {
  justify-content: flex-end;
}

.navbar-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  letter-spacing: 1px;
}

.favorites-toggle {
  position: relative;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: #f5e6c8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  padding: 0;
  transition: background 0.2s ease;
}

.favorites-toggle:hover {
  background: rgba(245, 230, 200, 0.1);
}

.favorites-toggle svg {
  width: 20px;
  height: 20px;
}

.fav-count {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  background: #e76f51;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  width: 16px;
  height: 16px;
  color: #a1887f;
  transition: all 0.2s ease;
  pointer-events: none;
}

.search-wrapper.is-focused .search-icon {
  color: #f5e6c8;
}

.search-input {
  width: 240px;
  height: 36px;
  padding: 0 14px 0 40px;
  border: none;
  border-radius: 20px;
  background: #5a3f2e;
  color: #f5e6c8;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
}

.search-input::placeholder {
  color: #a1887f;
  transition: all 0.2s ease;
}

.search-input:focus::placeholder {
  transform: translateY(-20px);
  opacity: 0;
}

.search-input:focus {
  background: #6d4c41;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.favorite-sidebar {
  width: 220px;
  background-color: #e8dcc8;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 12px rgba(61, 43, 31, 0.1);
}

.sidebar-header {
  padding: 20px 16px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(61, 43, 31, 0.1);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #3d2b1f;
}

.sidebar-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #5d4037;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  padding: 0;
  transition: background 0.2s ease;
}

.sidebar-close:hover {
  background: rgba(61, 43, 31, 0.08);
}

.sidebar-close svg {
  width: 16px;
  height: 16px;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.empty-favorites {
  padding: 40px 16px;
  text-align: center;
  color: #8d6e63;
  font-size: 13px;
}

.favorite-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
  margin-bottom: 8px;
}

.favorite-item:hover {
  background: rgba(61, 43, 31, 0.06);
}

.favorite-thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.favorite-info {
  flex: 1;
  min-width: 0;
}

.favorite-name {
  margin: 0 0 4px 0;
  font-size: 13px;
  font-weight: 600;
  color: #3d2b1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.favorite-artist {
  margin: 0;
  font-size: 11px;
  color: #6d4c41;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-left-enter-active,
.sidebar-left-leave-active {
  transition: transform 0.3s ease-out;
}

.sidebar-left-enter-from,
.sidebar-left-leave-to {
  transform: translateX(-100%);
}

.detail-panel {
  width: 380px;
  background-color: #fff;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: -4px 0 20px rgba(61, 43, 31, 0.15);
  overflow-y: auto;
}

.detail-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: #3d2b1f;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  padding: 0;
  z-index: 10;
  transition: background 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.detail-close:hover {
  background: #f5f0e8;
}

.detail-close svg {
  width: 18px;
  height: 18px;
}

.detail-cover {
  width: 100%;
  flex-shrink: 0;
}

.detail-cover img {
  width: 100%;
  height: 380px;
  object-fit: cover;
  display: block;
}

.detail-content {
  padding: 24px;
  flex: 1;
}

.detail-tags {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.edition-tag {
  padding: 4px 14px;
  border-radius: 14px;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #f5f0e8;
  border-radius: 14px;
  font-size: 12px;
  color: #5d4037;
  font-weight: 500;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.detail-name {
  font-size: 22px;
  font-weight: 700;
  color: #3d2b1f;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.detail-artist {
  font-size: 15px;
  color: #6d4c41;
  margin: 0 0 4px 0;
}

.detail-year {
  font-size: 13px;
  color: #8d6e63;
  margin: 0 0 24px 0;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  font-size: 13px;
  font-weight: 600;
  color: #8d6e63;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-phone {
  font-size: 15px;
  color: #3d2b1f;
  margin: 0;
  font-weight: 500;
}

.detail-story {
  font-size: 14px;
  color: #5d4037;
  margin: 0;
  line-height: 1.7;
}

.sidebar-right-enter-active,
.sidebar-right-leave-active {
  transition: transform 0.3s ease-out;
}

.sidebar-right-enter-from,
.sidebar-right-leave-to {
  transform: translateX(100%);
}

.fab-btn {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #e76f51, #d45d3a);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-shadow: 0 4px 20px rgba(231, 111, 81, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  z-index: 50;
}

.fab-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(231, 111, 81, 0.5);
}

.fab-btn:active {
  transform: translateY(0);
}

.fab-btn svg {
  width: 24px;
  height: 24px;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .navbar {
    padding: 0 16px;
    position: sticky;
    top: 0;
  }

  .navbar-left,
  .navbar-right {
    min-width: auto;
  }

  .navbar-title {
    font-size: 15px;
  }

  .search-input {
    width: 120px;
    font-size: 12px;
  }

  .favorite-sidebar {
    position: fixed;
    top: 56px;
    left: 0;
    bottom: 0;
    z-index: 90;
  }

  .detail-panel {
    position: fixed;
    top: 56px;
    right: 0;
    bottom: 0;
    z-index: 90;
    width: 100%;
  }

  .fab-btn {
    width: 44px;
    height: 44px;
    bottom: 20px;
    right: 20px;
  }

  .fab-btn svg {
    width: 20px;
    height: 20px;
  }
}
</style>
