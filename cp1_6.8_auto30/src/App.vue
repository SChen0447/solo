<template>
  <div class="app" :style="{ backgroundColor: currentTheme.background }">
    <nav class="navbar">
      <div class="nav-left">
        <div class="logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="10" :stroke="currentTheme.primary" stroke-width="2" fill="none"/>
            <rect x="7" y="7" width="14" height="14" :stroke="currentTheme.secondary" stroke-width="2" fill="none" transform="rotate(45 14 14)"/>
          </svg>
          <span class="logo-text">几何画廊</span>
        </div>
      </div>
      <div class="nav-right">
        <div class="nav-btn" @click="showThemeMenu = !showThemeMenu" @mouseenter="hoveredBtn = 'theme'" @mouseleave="hoveredBtn = null">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            <path d="M2 12h20"/>
          </svg>
          <Transition name="tooltip">
            <span v-if="hoveredBtn === 'theme'" class="tooltip">切换主题</span>
          </Transition>
          <Transition name="menu">
            <div v-if="showThemeMenu" class="theme-menu">
              <div
                v-for="(theme, idx) in themeList"
                :key="theme.name"
                class="theme-item"
                :class="{ active: idx === currentThemeIndex }"
                @click.stop="handleThemeChange(idx)"
              >
                <div class="theme-preview">
                  <span v-for="(color, i) in theme.patterns.slice(0, 5)" :key="i" class="color-dot" :style="{ backgroundColor: color }"></span>
                </div>
                <span class="theme-name">{{ theme.name }}</span>
              </div>
            </div>
          </Transition>
        </div>

        <div class="nav-btn" @click="handleExport" @mouseenter="hoveredBtn = 'export'" @mouseleave="hoveredBtn = null">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <Transition name="tooltip">
            <span v-if="hoveredBtn === 'export'" class="tooltip">导出 SVG</span>
          </Transition>
        </div>

        <div class="nav-btn" @click="handleShare" @mouseenter="hoveredBtn = 'share'" @mouseleave="hoveredBtn = null">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <Transition name="tooltip">
            <span v-if="hoveredBtn === 'share'" class="tooltip">复制链接</span>
          </Transition>
        </div>
      </div>
    </nav>

    <main class="main-content">
      <PatternBoard
        ref="patternBoardRef"
        :patterns="patterns"
        :selected-id="selectedPatternId"
        :colors="currentTheme.patterns"
        @select="handleSelectPattern"
        @update:patterns="handlePatternsUpdate"
      />
    </main>

    <PropertyPanel
      v-if="selectedPatternId !== null && showPropertyPanel"
      :visible="showPropertyPanel"
      :rotation="selectedPattern?.rotation ?? 0"
      :scale="selectedPattern?.scale ?? 1"
      :opacity="selectedPattern?.opacity ?? 1"
      :panel-top="propertyPanelTop"
      :panel-left="propertyPanelLeft"
      @update:rotation="handleRotationChange"
      @update:scale="handleScaleChange"
      @update:opacity="handleOpacityChange"
      @close="showPropertyPanel = false"
    />

    <Transition name="toast">
      <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import PatternBoard from './components/PatternBoard.vue'
import type { PatternData } from './components/PatternBoard.vue'
import PropertyPanel from './components/PropertyPanel.vue'
import { currentTheme, themeList, setTheme, getCurrentThemeIndex } from './utils/theme'
import { exportSVG, downloadSVG, generateShareURL, copyToClipboard, parseShareURL } from './utils/export'

const patternBoardRef = ref<InstanceType<typeof PatternBoard> | null>(null)
const selectedPatternId = ref<number | null>(null)
const showPropertyPanel = ref(false)
const propertyPanelTop = ref(100)
const propertyPanelLeft = ref(100)
const showThemeMenu = ref(false)
const hoveredBtn = ref<string | null>(null)
const toastVisible = ref(false)
const toastMessage = ref('')

const currentThemeIndex = computed(() => getCurrentThemeIndex())

const initialPatterns: PatternData[] = [
  { id: 1, type: 'circle', x: 150, y: 150, rotation: 0, scale: 1, opacity: 1, colorIndex: 0 },
  { id: 2, type: 'square', x: 300, y: 150, rotation: 0, scale: 1, opacity: 1, colorIndex: 1 },
  { id: 3, type: 'triangle', x: 450, y: 150, rotation: 0, scale: 1, opacity: 1, colorIndex: 2 },
  { id: 4, type: 'hexagon', x: 600, y: 150, rotation: 0, scale: 1, opacity: 1, colorIndex: 3 },
  { id: 5, type: 'star', x: 150, y: 350, rotation: 0, scale: 1, opacity: 1, colorIndex: 4 },
  { id: 6, type: 'spiral', x: 300, y: 350, rotation: 0, scale: 1, opacity: 1, colorIndex: 5 },
  { id: 7, type: 'wave', x: 450, y: 350, rotation: 0, scale: 1, opacity: 1, colorIndex: 6 },
  { id: 8, type: 'dots', x: 600, y: 350, rotation: 0, scale: 1, opacity: 1, colorIndex: 7 }
]

const patterns = ref<PatternData[]>([...initialPatterns])

const selectedPattern = computed(() => {
  return patterns.value.find(p => p.id === selectedPatternId.value) || null
})

function showToast(message: string): void {
  toastMessage.value = message
  toastVisible.value = true
  setTimeout(() => {
    toastVisible.value = false
  }, 2000)
}

function handleSelectPattern(id: number | null): void {
  selectedPatternId.value = id
  if (id !== null) {
    showPropertyPanel.value = true
    const pattern = patterns.value.find(p => p.id === id)
    if (pattern) {
      propertyPanelTop.value = 120
      propertyPanelLeft.value = Math.min(pattern.x + 80, window.innerWidth - 300)
    }
  } else {
    showPropertyPanel.value = false
  }
  showThemeMenu.value = false
}

function handlePatternsUpdate(newPatterns: PatternData[]): void {
  patterns.value = newPatterns
}

function handleRotationChange(value: number): void {
  if (selectedPatternId.value === null) return
  const idx = patterns.value.findIndex(p => p.id === selectedPatternId.value)
  if (idx !== -1) {
    patterns.value[idx] = { ...patterns.value[idx], rotation: value }
  }
}

function handleScaleChange(value: number): void {
  if (selectedPatternId.value === null) return
  const idx = patterns.value.findIndex(p => p.id === selectedPatternId.value)
  if (idx !== -1) {
    patterns.value[idx] = { ...patterns.value[idx], scale: value }
  }
}

function handleOpacityChange(value: number): void {
  if (selectedPatternId.value === null) return
  const idx = patterns.value.findIndex(p => p.id === selectedPatternId.value)
  if (idx !== -1) {
    patterns.value[idx] = { ...patterns.value[idx], opacity: value }
  }
}

function handleThemeChange(index: number): void {
  setTheme(index)
  showThemeMenu.value = false
  showToast(`已切换到「${themeList[index].name}」主题`)
}

function handleExport(): void {
  if (!patternBoardRef.value) return
  const canvasWidth = patternBoardRef.value.canvasWidth
  const canvasHeight = patternBoardRef.value.canvasHeight
  const svgContent = exportSVG(patterns.value, canvasWidth, canvasHeight, currentTheme.value.patterns)
  downloadSVG(svgContent, 'geometry-gallery.svg')
  showToast('SVG 文件已导出')
  showThemeMenu.value = false
}

function handleShare(): void {
  const url = generateShareURL(patterns.value, getCurrentThemeIndex())
  copyToClipboard(url).then(success => {
    if (success) {
      showToast('分享链接已复制到剪贴板')
    } else {
      showToast('复制失败，请手动复制')
    }
  })
  showThemeMenu.value = false
}

onMounted(() => {
  const saved = parseShareURL()
  if (saved && saved.patterns.length > 0) {
    patterns.value = saved.patterns
    setTheme(saved.themeIndex)
  }

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.nav-btn') && !target.closest('.theme-menu')) {
      showThemeMenu.value = false
    }
  })
})
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

.app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transition: background-color 0.5s ease;
  color: var(--text-color, #fff);
  display: flex;
  flex-direction: column;
}

.navbar {
  position: relative;
  z-index: 100;
  height: 60px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--nav-bg, rgba(26, 26, 46, 0.7));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-top: 24px;
}

.nav-left {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-color, #fff);
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-btn {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-muted, rgba(255,255,255,0.6));
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-btn:hover {
  color: var(--text-color, #fff);
  background: var(--button-hover, rgba(102, 126, 234, 0.3));
  transform: translateY(-3px);
}

.tooltip {
  position: absolute;
  bottom: -32px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 12px;
  border-radius: 6px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1000;
}

.tooltip-enter-active,
.tooltip-leave-active {
  transition: all 0.2s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}

.theme-menu {
  position: absolute;
  top: 50px;
  right: 0;
  width: 180px;
  padding: 8px;
  background: var(--nav-bg, rgba(26, 26, 46, 0.95));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

.theme-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.theme-item:hover {
  background: var(--button-hover, rgba(102, 126, 234, 0.2));
}

.theme-item.active {
  background: var(--button-hover, rgba(102, 126, 234, 0.3));
}

.theme-preview {
  display: flex;
  gap: 2px;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.theme-name {
  font-size: 13px;
  color: var(--text-color, #fff);
}

.menu-enter-active,
.menu-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

.main-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  font-size: 14px;
  border-radius: 10px;
  z-index: 9999;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
