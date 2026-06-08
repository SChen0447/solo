<template>
  <div class="app-container" :class="{ 'mobile-layout': isMobile }">
    <aside
      v-if="!isMobile || showHistory"
      class="history-sidebar"
      :class="{ open: showHistory }"
    >
      <div class="sidebar-header">
        <h3 class="sidebar-title">历史记录</h3>
        <button v-if="isMobile" class="close-btn" @click="showHistory = false">×</button>
      </div>
      <div class="history-list">
        <div v-if="history.length === 0" class="empty-history">
          <p>暂无历史记录</p>
          <p class="hint">完成至少4个节点的图案后自动保存</p>
        </div>
        <div
          v-for="item in history"
          :key="item.id"
          class="history-item"
          @click="restoreFromHistory(item)"
        >
          <div class="history-thumbnail">
            <svg :viewBox="`0 0 100 100`" class="thumbnail-svg">
              <path
                v-for="(segment, idx) in getThumbnailSegments(item)"
                :key="idx"
                :d="segment.d"
                :stroke="item.config.lineColor"
                :stroke-width="item.config.lineWidth * 1.5"
                fill="none"
                stroke-linecap="round"
              />
              <circle
                v-for="pos in getThumbnailNodes(item)"
                :key="pos.id"
                :cx="pos.x"
                :cy="pos.y"
                :r="item.config.nodeSize * 0.8"
                :fill="pos.color"
              />
            </svg>
          </div>
          <div class="history-info">
            <span class="history-time">{{ formatTime(item.timestamp) }}</span>
            <span class="history-count">{{ item.path.length }}个节点</span>
          </div>
          <button
            class="delete-btn"
            @click.stop="deleteHistory(item.id)"
            title="删除"
          >
            ×
          </button>
        </div>
      </div>
    </aside>

    <div class="main-content">
      <header class="top-toolbar">
        <div class="toolbar-left">
          <button v-if="isMobile" class="menu-btn" @click="showHistory = !showHistory">
            ☰
          </button>
          <h1 class="app-title">手势图案生成器</h1>
        </div>
        <div class="toolbar-right">
          <span class="path-status" :class="{ valid: gesture.isValidPath.value }">
            {{ gesture.path.value.length }} / 4+ 节点
          </span>
        </div>
      </header>

      <div class="content-area">
        <div
          v-if="!isMobile"
          class="config-pane"
          :style="{ width: leftPanelWidth + '%' }"
        >
          <ConfigPanel
            :config="config"
            @update:config="updateConfig"
            @reset="resetPath"
            @save="savePattern"
            @share="copyLink"
          />
        </div>

        <div
          v-if="!isMobile"
          class="divider"
          :class="{ dragging: isDragging }"
          @mousedown="startDrag"
        >
          <div class="divider-handle">
            <span class="divider-label" v-show="isDragging">拖拽调整</span>
          </div>
        </div>

        <div class="canvas-pane" :style="{ width: isMobile ? '100%' : (100 - leftPanelWidth) + '%' }">
          <div class="canvas-wrapper">
            <CanvasView
              ref="canvasRef"
              :config="config"
              :gesture="gesture"
              @path-complete="onPathComplete"
              @node-color-change="onNodeColorChange"
            />
          </div>

          <div v-if="isMobile" class="mobile-config-toggle" @click="showMobileConfig = !showMobileConfig">
            <span>{{ showMobileConfig ? '收起配置' : '展开配置' }}</span>
          </div>

          <transition name="mobile-drawer">
            <div v-if="isMobile && showMobileConfig" class="mobile-config-drawer">
              <ConfigPanel
                :config="config"
                @update:config="updateConfig"
                @reset="resetPath"
                @save="savePattern"
                @share="copyLink"
              />
            </div>
          </transition>
        </div>
      </div>

      <footer class="bottom-preview">
        <div class="preview-section">
          <span class="preview-label">实时预览</span>
          <div class="preview-thumbnail rotating">
            <svg :viewBox="`0 0 100 100`" class="preview-svg">
              <path
                v-for="(segment, idx) in previewSegments"
                :key="'p-' + idx"
                :d="segment.d"
                :stroke="config.lineColor"
                :stroke-width="config.lineWidth * 1.5"
                fill="none"
                stroke-linecap="round"
              />
              <circle
                v-for="(pos, idx) in previewNodes"
                :key="'n-' + idx"
                :cx="pos.x"
                :cy="pos.y"
                :r="config.nodeSize * 0.8"
                :fill="pos.color"
              />
            </svg>
          </div>
        </div>

        <div class="action-section">
          <button class="action-btn primary-btn" @click="savePattern">
            <span class="btn-icon">💾</span>
            保存 SVG
          </button>
          <button class="action-btn secondary-btn" @click="copyLink">
            <span class="btn-icon">🔗</span>
            复制链接
          </button>
        </div>
      </footer>
    </div>

    <div v-if="toastMessage" class="toast" :class="{ show: showToast }">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import CanvasView from './components/CanvasView.vue'
import ConfigPanel from './components/ConfigPanel.vue'
import { useGesture } from './composables/useGesture'
import type { GestureConfig, HistoryItem } from './types'
import { DEFAULT_CONFIG } from './types'

const canvasRef = ref<InstanceType<typeof CanvasView> | null>(null)

const config = reactive<GestureConfig>({ ...DEFAULT_CONFIG })

const canvasSize = reactive({ width: 400, height: 400 })
const gesture = useGesture(canvasSize)

const leftPanelWidth = ref(30)
const isDragging = ref(false)

const isMobile = ref(false)
const showMobileConfig = ref(false)
const showHistory = ref(false)

const history = ref<HistoryItem[]>([])
const HISTORY_KEY = 'gesture_pattern_history'
const MAX_HISTORY = 10

const toastMessage = ref('')
const showToast = ref(false)

const updateConfig = (newConfig: GestureConfig) => {
  Object.assign(config, newConfig)
}

const startDrag = (e: MouseEvent) => {
  isDragging.value = true
  e.preventDefault()
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  const container = document.querySelector('.content-area')
  if (!container) return
  const rect = container.getBoundingClientRect()
  const percentage = ((e.clientX - rect.left) / rect.width) * 100
  leftPanelWidth.value = Math.max(20, Math.min(50, percentage))
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

const resetPath = () => {
  gesture.resetPath()
}

const onPathComplete = () => {
  saveToHistory()
  showToastMessage('图案已保存到历史记录')
}

const onNodeColorChange = () => {
}

const saveToHistory = () => {
  if (!gesture.isValidPath.value) return

  const item: HistoryItem = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    nodeColors: gesture.getAllNodeColors(),
    path: [...gesture.path.value],
    config: { ...config }
  }

  history.value.unshift(item)
  if (history.value.length > MAX_HISTORY) {
    history.value.pop()
  }

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
}

const loadHistory = () => {
  try {
    const saved = localStorage.getItem(HISTORY_KEY)
    if (saved) {
      history.value = JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load history:', e)
  }
}

const deleteHistory = (id: string) => {
  history.value = history.value.filter(item => item.id !== id)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
}

const restoreFromHistory = (item: HistoryItem) => {
  Object.assign(config, item.config)
  gesture.restoreFromHistory(item.nodeColors, item.path)
  if (isMobile.value) {
    showHistory.value = false
  }
  showToastMessage('已恢复历史图案')
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const getThumbnailSegments = (item: HistoryItem) => {
  const segments: { d: string }[] = []
  const positions = getThumbnailNodePositions(item)

  for (let i = 1; i < item.path.length; i++) {
    const from = positions[item.path[i - 1]]
    const to = positions[item.path[i]]
    if (from && to) {
      const midX = (from.x + to.x) / 2
      const midY = (from.y + to.y) / 2
      const dx = to.x - from.x
      const dy = to.y - from.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const curveAmount = Math.min(dist * 0.2, 15)
      const ctrlX = midX - dy * curveAmount / dist * 0.5
      const ctrlY = midY + dx * curveAmount / dist * 0.5
      segments.push({
        d: `M ${from.x} ${from.y} Q ${ctrlX} ${ctrlY} ${to.x} ${to.y}`
      })
    }
  }
  return segments
}

const getThumbnailNodes = (item: HistoryItem) => {
  const positions = getThumbnailNodePositions(item)
  return item.path.map(id => ({
    id,
    x: positions[id]?.x || 0,
    y: positions[id]?.y || 0,
    color: item.nodeColors[id] || '#e94560'
  }))
}

const getThumbnailNodePositions = (item: HistoryItem): Record<number, { x: number; y: number }> => {
  const positions: Record<number, { x: number; y: number }> = {}
  const padding = 20
  const size = 100 - padding * 2
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3)
    const col = i % 3
    positions[i] = {
      x: padding + col * (size / 2),
      y: padding + row * (size / 2)
    }
  }
  return positions
}

const previewSegments = computed(() => {
  const item: HistoryItem = {
    id: 'preview',
    timestamp: Date.now(),
    nodeColors: gesture.getAllNodeColors(),
    path: [...gesture.path.value],
    config: { ...config }
  }
  return getThumbnailSegments(item)
})

const previewNodes = computed(() => {
  const item: HistoryItem = {
    id: 'preview',
    timestamp: Date.now(),
    nodeColors: gesture.getAllNodeColors(),
    path: [...gesture.path.value],
    config: { ...config }
  }
  return getThumbnailNodes(item)
})

const savePattern = () => {
  if (!gesture.isValidPath.value) {
    showToastMessage('请先连接至少4个节点')
    return
  }

  const svgElement = canvasRef.value?.svgRef
  if (!svgElement) return

  const serializer = new XMLSerializer()
  let svgString = serializer.serializeToString(svgElement)

  svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString

  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)

  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const filename = `gesture_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.svg`

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  showToastMessage('SVG 文件已下载')
}

const copyLink = async () => {
  if (!gesture.isValidPath.value) {
    showToastMessage('请先连接至少4个节点')
    return
  }

  const patternData = {
    p: gesture.path.value,
    c: config.lineColor,
    nc: gesture.getAllNodeColors(),
    ns: config.nodeSize,
    lw: config.lineWidth,
    bg: config.bgType
  }

  try {
    const jsonStr = JSON.stringify(patternData)
    const base64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16))
    }))

    let shortBase64 = base64
    if (base64.length > 200) {
      const compressed = compressBase64(base64)
      shortBase64 = compressed.substring(0, 200)
    }

    const url = `${window.location.origin}${window.location.pathname}?pattern=${shortBase64}`

    await navigator.clipboard.writeText(url)
    showToastMessage('链接已复制到剪贴板')
  } catch (e) {
    showToastMessage('复制失败，请手动复制')
  }
}

const compressBase64 = (str: string): string => {
  let result = ''
  let count = 1
  for (let i = 1; i < str.length; i++) {
    if (str[i] === str[i - 1] && count < 9) {
      count++
    } else {
      result += count > 1 ? count + str[i - 1] : str[i - 1]
      count = 1
    }
  }
  result += count > 1 ? count + str[str.length - 1] : str[str.length - 1]
  return result
}

const showToastMessage = (msg: string) => {
  toastMessage.value = msg
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
    setTimeout(() => {
      toastMessage.value = ''
    }, 300)
  }, 2000)
}

onMounted(() => {
  checkMobile()
  loadHistory()
  window.addEventListener('resize', checkMobile)

  const params = new URLSearchParams(window.location.search)
  const patternParam = params.get('pattern')
  if (patternParam) {
    console.log('Pattern from URL:', patternParam)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

watch(config, () => {
}, { deep: true })
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  background: #1a1a2e;
  overflow: hidden;
}

.history-sidebar {
  width: 200px;
  background: #16213e;
  border-right: 1px solid rgba(233, 69, 96, 0.2);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid rgba(233, 69, 96, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: #e94560;
}

.close-btn {
  background: none;
  border: none;
  color: #e0e0e0;
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.empty-history {
  text-align: center;
  padding: 30px 10px;
  color: #95a5a6;
  font-size: 13px;
}

.empty-history .hint {
  margin-top: 8px;
  font-size: 11px;
  color: #7f8c8d;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  margin-bottom: 8px;
  background: #1a1a2e;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.history-item:hover {
  background: #0f3460;
  transform: translateX(4px);
}

.history-thumbnail {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  background: #1a1a2e;
  border-radius: 6px;
  overflow: hidden;
}

.thumbnail-svg {
  width: 100%;
  height: 100%;
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-time {
  display: block;
  font-size: 12px;
  color: #e0e0e0;
}

.history-count {
  display: block;
  font-size: 11px;
  color: #95a5a6;
  margin-top: 2px;
}

.delete-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(233, 69, 96, 0.2);
  color: #e94560;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.history-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #e94560;
  color: white;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.top-toolbar {
  height: 56px;
  padding: 0 20px;
  background: #16213e;
  border-bottom: 1px solid rgba(233, 69, 96, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-btn {
  background: none;
  border: none;
  color: #e0e0e0;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
}

.app-title {
  font-size: 18px;
  font-weight: 600;
  color: #e0e0e0;
}

.path-status {
  font-size: 13px;
  padding: 6px 12px;
  background: #1a1a2e;
  border-radius: 20px;
  color: #95a5a6;
}

.path-status.valid {
  color: #26de81;
  background: rgba(38, 222, 129, 0.1);
}

.content-area {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
}

.config-pane {
  background: #16213e;
  overflow: hidden;
  flex-shrink: 0;
}

.divider {
  width: 6px;
  background: transparent;
  cursor: col-resize;
  flex-shrink: 0;
  position: relative;
  transition: background 0.2s ease;
}

.divider:hover,
.divider.dragging {
  background: rgba(233, 69, 96, 0.3);
}

.divider-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 40px;
  background: rgba(233, 69, 96, 0.5);
  border-radius: 2px;
  transition: all 0.2s ease;
}

.divider.dragging .divider-handle {
  background: #e94560;
  height: 60px;
}

.divider-label {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: #e94560;
  background: #16213e;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.canvas-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
}

.canvas-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  min-height: 0;
}

.mobile-config-toggle {
  padding: 12px;
  text-align: center;
  color: #e94560;
  background: #16213e;
  cursor: pointer;
  font-size: 14px;
  border-top: 1px solid rgba(233, 69, 96, 0.2);
}

.mobile-config-drawer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 70%;
  background: #16213e;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  overflow: hidden;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.mobile-drawer-enter-active,
.mobile-drawer-leave-active {
  transition: transform 0.3s ease;
}

.mobile-drawer-enter-from,
.mobile-drawer-leave-to {
  transform: translateY(100%);
}

.bottom-preview {
  height: 80px;
  background: #16213e;
  border-top: 1px solid rgba(233, 69, 96, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}

.preview-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.preview-label {
  font-size: 13px;
  color: #95a5a6;
}

.preview-thumbnail {
  width: 56px;
  height: 56px;
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid rgba(233, 69, 96, 0.3);
}

.preview-thumbnail.rotating {
  animation: rotate 4s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.preview-svg {
  width: 100%;
  height: 100%;
}

.action-section {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: scale(1.05);
}

.action-btn:active {
  transform: scale(0.98);
}

.primary-btn {
  background: #e94560;
  color: white;
  box-shadow: 0 2px 10px rgba(233, 69, 96, 0.3);
}

.primary-btn:hover {
  background: #ff6b7f;
  box-shadow: 0 4px 15px rgba(233, 69, 96, 0.4);
}

.secondary-btn {
  background: #0f3460;
  color: white;
}

.secondary-btn:hover {
  background: #1a5276;
}

.btn-icon {
  font-size: 16px;
}

.toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  padding: 12px 24px;
  background: rgba(22, 33, 62, 0.95);
  color: #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 1000;
  border: 1px solid rgba(233, 69, 96, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

@media (max-width: 768px) {
  .app-container.mobile-layout {
    flex-direction: column;
  }

  .history-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .history-sidebar.open {
    transform: translateX(0);
  }

  .bottom-preview {
    height: auto;
    flex-direction: column;
    gap: 12px;
    padding: 12px 16px;
  }

  .preview-section {
    width: 100%;
    justify-content: center;
  }

  .action-section {
    width: 100%;
  }

  .action-btn {
    flex: 1;
    justify-content: center;
  }
}

.history-list::-webkit-scrollbar {
  width: 4px;
}

.history-list::-webkit-scrollbar-track {
  background: #1a1a2e;
}

.history-list::-webkit-scrollbar-thumb {
  background: #e94560;
  border-radius: 2px;
}
</style>
