<template>
  <div class="app-container">
    <transition name="fade">
      <div
        v-if="isMobile && sidebarOpen"
        class="sidebar-overlay"
        @click="sidebarOpen = false"
      ></div>
    </transition>

    <aside
      class="sidebar"
      :class="{ 'sidebar-mobile-open': isMobile && sidebarOpen }"
    >
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-icon">📚</span>
          <span class="logo-text">藏书阁</span>
        </div>
        <button
          v-if="isMobile"
          class="close-btn"
          @click="sidebarOpen = false"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div class="sidebar-content">
        <CategoryTree />
      </div>
    </aside>

    <main class="main-content">
      <header class="top-header">
        <button
          v-if="isMobile"
          class="hamburger-btn"
          @click="sidebarOpen = true"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </header>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import CategoryTree from '@/components/CategoryTree.vue'

const isMobile = ref(false)
const sidebarOpen = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) {
    sidebarOpen.value = false
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.sidebar {
  width: 25%;
  min-width: 220px;
  max-width: 280px;
  background: var(--color-bg-card);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
  z-index: 100;
}

.sidebar-header {
  padding: 20px 20px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  color: var(--color-text-light);
  transition: var(--transition);
}

.close-btn:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 99;
}

.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.top-header {
  padding: 20px 28px;
  flex: 1;
  overflow-y: auto;
}

.hamburger-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  color: var(--color-text);
  transition: var(--transition);
  margin-bottom: 16px;
}

.hamburger-btn:hover {
  background: var(--color-border);
}

.hamburger-btn svg {
  width: 22px;
  height: 22px;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 260px;
    max-width: 80vw;
    transform: translateX(-100%);
    box-shadow: var(--shadow-lg);
  }

  .sidebar-mobile-open {
    transform: translateX(0);
  }

  .hamburger-btn {
    display: flex;
  }

  .top-header {
    padding: 16px;
  }
}
</style>
