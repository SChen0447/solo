<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-inner">
        <div class="brand">
          <span class="logo">📚</span>
          <span class="brand-name">独立书店</span>
        </div>
        <button
          class="menu-toggle"
          :class="{ active: mobileMenuOpen }"
          @click="mobileMenuOpen = !mobileMenuOpen"
          aria-label="菜单"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <nav class="desktop-nav">
          <router-link to="/" class="nav-link" :class="{ active: route.path === '/' }">
            📖 书籍浏览
          </router-link>
          <router-link
            to="/reading-list"
            class="nav-link"
            :class="{ active: route.path === '/reading-list' }"
          >
            📋 阅读清单
            <span v-if="store.readingListCount > 0" class="nav-badge">
              {{ store.readingListCount }}
            </span>
          </router-link>
        </nav>
      </div>
      <nav v-if="mobileMenuOpen" class="mobile-nav">
        <router-link
          to="/"
          class="nav-link"
          :class="{ active: route.path === '/' }"
          @click="mobileMenuOpen = false"
        >
          📖 书籍浏览
        </router-link>
        <router-link
          to="/reading-list"
          class="nav-link"
          :class="{ active: route.path === '/reading-list' }"
          @click="mobileMenuOpen = false"
        >
          📋 阅读清单
          <span v-if="store.readingListCount > 0" class="nav-badge">
            {{ store.readingListCount }}
          </span>
        </router-link>
      </nav>
    </header>

    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <nav class="bottom-nav">
      <router-link to="/" class="bottom-link" :class="{ active: route.path === '/' }">
        <span class="bottom-icon">📖</span>
        <span class="bottom-label">书籍</span>
      </router-link>
      <router-link
        to="/reading-list"
        class="bottom-link"
        :class="{ active: route.path === '/reading-list' }"
      >
        <span class="bottom-icon">📋</span>
        <span class="bottom-label">
          清单
          <span v-if="store.readingListCount > 0" class="bottom-badge">
            {{ store.readingListCount }}
          </span>
        </span>
      </router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBookStore } from './store'

const route = useRoute()
const store = useBookStore()
const mobileMenuOpen = ref(false)

let stockTimer: number | null = null

onMounted(() => {
  store.loadBooks()
  stockTimer = window.setInterval(() => {
    store.simulateStockDecrease()
  }, 10000)
})

onUnmounted(() => {
  if (stockTimer) {
    clearInterval(stockTimer)
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background: #faf6ef;
  color: #3d2c1e;
  -webkit-font-smoothing: antialiased;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(135deg, #6b4423 0%, #8b5a2b 100%);
  color: #faf6ef;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 12px rgba(107, 68, 35, 0.2);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  font-size: 28px;
}

.brand-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
}

.desktop-nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  color: rgba(250, 246, 239, 0.85);
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.25s ease;
}

.nav-link:hover {
  background: rgba(250, 246, 239, 0.12);
  color: #faf6ef;
}

.nav-link.active {
  background: #4a7c59;
  color: #faf6ef;
}

.nav-badge {
  background: #e67e22;
  color: #fff;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 10px;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
}

.menu-toggle {
  display: none;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  flex-direction: column;
  gap: 5px;
}

.menu-toggle span {
  width: 24px;
  height: 2px;
  background: #faf6ef;
  border-radius: 2px;
  transition: all 0.25s ease;
}

.menu-toggle.active span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.menu-toggle.active span:nth-child(2) {
  opacity: 0;
}

.menu-toggle.active span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

.mobile-nav {
  display: none;
  flex-direction: column;
  padding: 0 20px 16px;
  gap: 4px;
}

.mobile-nav .nav-link {
  padding: 12px 16px;
}

.app-main {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 20px 100px;
}

.bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid #e8dfd0;
  padding: 8px 0;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  z-index: 100;
}

.bottom-link {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-decoration: none;
  color: #8b7355;
  font-size: 12px;
  transition: color 0.2s ease;
  padding: 4px 0;
}

.bottom-link.active {
  color: #4a7c59;
}

.bottom-icon {
  font-size: 22px;
}

.bottom-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.bottom-badge {
  background: #e67e22;
  color: #fff;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 700;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .desktop-nav {
    display: none;
  }

  .menu-toggle {
    display: flex;
  }

  .mobile-nav {
    display: flex;
  }

  .bottom-nav {
    display: flex;
  }

  .app-main {
    padding: 16px 14px 90px;
  }

  .brand-name {
    font-size: 18px;
  }
}
</style>
