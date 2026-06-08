<template>
  <div class="editor-view" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <Toolbar
      :current-tool="currentTool"
      :is-collapsed="isSidebarCollapsed"
      :can-undo="canUndo"
      :can-redo="canRedo"
      @select-tool="handleSelectTool"
      @undo="handleUndo"
      @redo="handleRedo"
      @export="handleExport"
      @share="handleShare"
    />

    <main class="editor-main">
      <header class="editor-header">
        <div class="header-title">
          <span class="logo-icon">◆</span>
          <span>交互原型动效演示器</span>
        </div>
        <div class="header-info">
          <span class="element-count">元素: {{ elements.length }}</span>
          <span v-if="timeline" class="keyframe-count">关键帧: {{ timeline.keyframes.length }}</span>
        </div>
      </header>

      <PrototypeStage
        :elements="isPlaying ? animElements : elements"
        :selected-id="selectedId"
        :current-tool="currentTool"
        :is-playing="isPlaying"
        :is-recording="isRecording"
        @select="handleSelectElement"
        @add-element="handleAddElement"
        @update-element="handleUpdateElement"
        @update-element-history="handleUpdateElementWithHistory"
        @record-keyframe="handleRecordKeyframe"
      />

      <PlaybackBar
        :is-playing="isPlaying"
        :is-recording="isRecording"
        :current-time="currentTime"
        :duration="duration"
        :playback-speed="playbackSpeed"
        :progress="progress"
        @play="handlePlay"
        @pause="handlePause"
        @stop="handleStop"
        @rewind="handleRewind"
        @forward="handleForward"
        @record-start="handleRecordStart"
        @record-stop="handleRecordStop"
        @seek="handleSeek"
        @speed-change="handleSpeedChange"
      />
    </main>

    <PropertyPanel
      :element="selectedElement"
      @update="handlePropertyUpdate"
      @delete="handleDeleteElement"
    />

    <div v-if="showShareModal" class="modal-overlay" @click="showShareModal = false">
      <div class="modal-content" @click.stop>
        <h3>分享原型</h3>
        <p class="modal-desc">复制以下链接分享给他人查看</p>
        <div class="share-link">
          <input type="text" :value="shareLink" readonly ref="shareLinkInput" />
          <button class="copy-btn" @click="copyShareLink">
            {{ copied ? '已复制!' : '复制' }}
          </button>
        </div>
        <button class="close-btn" @click="showShareModal = false">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Toolbar from '@/components/Toolbar.vue'
import PrototypeStage from '@/components/PrototypeStage.vue'
import PropertyPanel from '@/components/PropertyPanel.vue'
import PlaybackBar from '@/components/PlaybackBar.vue'
import { useEditorState } from '@/composables/useEditorState'
import { useAnimationEngine } from '@/composables/useAnimationEngine'
import type { PrototypeElement, ElementStyle, ToolType, AnimationTimeline, ExportData } from '@/types'
import { generateId, copyToClipboard, serializeExport } from '@/utils/helpers'
import { createShareLink, loadShareData, exportToJSON, loadFromLocal, saveToLocal } from '@/utils/storage'

const route = useRoute()
const router = useRouter()

const {
  elements,
  selectedId,
  selectedElement,
  currentTool,
  canUndo,
  canRedo,
  addElement,
  updateElement,
  updateElementWithHistory,
  deleteElement,
  selectElement,
  setTool,
  clearSelection,
  saveHistory,
  undo,
  redo,
  setElements,
  initHistory
} = useEditorState()

const animElements = ref<PrototypeElement[]>([])
const currentTime = ref(0)
const duration = ref(0)
const isPlaying = ref(false)
const isRecording = ref(false)
const playbackSpeed = ref(1)
const progress = ref(0)
const timeline = ref<AnimationTimeline | null>(null)

let animationEngine: ReturnType<typeof useAnimationEngine> | null = null

const isSidebarCollapsed = ref(false)
const showShareModal = ref(false)
const shareLink = ref('')
const copied = ref(false)
const shareLinkInput = ref<HTMLInputElement | null>(null)

const initAnimationEngine = () => {
  animationEngine = useAnimationEngine(elements.value, {
    onFrame: (animatedElements) => {
      animElements.value = animatedElements
      currentTime.value = animationEngine?.currentTime.value || 0
      progress.value = animationEngine?.progress.value || 0
    },
    onComplete: () => {
      isPlaying.value = false
    }
  })

  watch(
    () => animationEngine?.isPlaying.value,
    (playing) => {
      isPlaying.value = playing || false
    }
  )

  watch(
    () => animationEngine?.isRecording.value,
    (recording) => {
      isRecording.value = recording || false
    }
  )

  watch(
    () => animationEngine?.duration.value,
    (dur) => {
      duration.value = dur || 0
    }
  )

  watch(
    () => animationEngine?.playbackSpeed.value,
    (speed) => {
      playbackSpeed.value = speed || 1
    }
  )
}

const handleSelectTool = (tool: ToolType) => {
  setTool(tool)
}

const handleSelectElement = (id: string | null) => {
  selectElement(id)
}

const handleAddElement = (type: string, x: number, y: number) => {
  const element = addElement(type, x, y)
  
  if (isRecording.value && animationEngine) {
    const style = element.style
    const props: (keyof ElementStyle)[] = ['x', 'y', 'width', 'height', 'rotation', 'opacity']
    props.forEach((prop) => {
      animationEngine?.recordKeyframe(element.id, prop, style[prop])
    })
  }
}

const handleUpdateElement = (id: string, updates: Partial<PrototypeElement>) => {
  updateElement(id, updates)
}

const handleUpdateElementWithHistory = (id: string, updates: Partial<PrototypeElement>) => {
  updateElementWithHistory(id, updates)
}

const handlePropertyUpdate = (id: string, updates: Partial<PrototypeElement>) => {
  updateElementWithHistory(id, updates)
  
  if (isRecording.value && animationEngine && updates.style) {
    const style = updates.style
    Object.entries(style).forEach(([prop, value]) => {
      if (typeof value === 'number') {
        animationEngine?.recordKeyframe(id, prop as keyof ElementStyle, value)
      }
    })
  }
}

const handleDeleteElement = (id: string) => {
  deleteElement(id)
}

const handleUndo = () => {
  undo()
}

const handleRedo = () => {
  redo()
}

const handlePlay = () => {
  if (animationEngine) {
    animationEngine.updateInitialElements(elements.value)
    animationEngine.play(false)
  }
}

const handlePause = () => {
  animationEngine?.pause()
}

const handleStop = () => {
  animationEngine?.stop()
}

const handleRewind = () => {
  if (animationEngine) {
    animationEngine.updateInitialElements(elements.value)
    animationEngine.play(true)
  }
}

const handleForward = () => {
  handlePlay()
}

const handleRecordStart = () => {
  if (animationEngine) {
    animationEngine.reset(elements.value)
    animationEngine.startRecording(elements.value)
    saveHistory()
  }
}

const handleRecordStop = () => {
  if (animationEngine) {
    const keyframes = animationEngine.stopRecording()
    
    timeline.value = {
      id: generateId(),
      name: '动画时间线',
      duration: animationEngine.duration.value,
      keyframes,
      createdAt: Date.now()
    }
    
    animationEngine.setKeyframes(keyframes, animationEngine.duration.value)
  }
}

const handleSeek = (time: number) => {
  if (animationEngine) {
    animationEngine.updateInitialElements(elements.value)
    animationEngine.seek(time)
  }
}

const handleSpeedChange = (speed: number) => {
  animationEngine?.setPlaybackSpeed(speed)
}

const handleRecordKeyframe = (
  elementId: string,
  property: keyof ElementStyle | 'interaction',
  value: number | string,
  interactionType?: string
) => {
  animationEngine?.recordKeyframe(elementId, property, value, interactionType)
}

const handleExport = () => {
  const data: ExportData = {
    version: '1.0.0',
    elements: elements.value,
    timeline: timeline.value,
    exportedAt: Date.now()
  }
  exportToJSON(data, `prototype-${Date.now()}.json`)
}

const handleShare = () => {
  const data: ExportData = {
    version: '1.0.0',
    elements: elements.value,
    timeline: timeline.value,
    exportedAt: Date.now()
  }
  shareLink.value = createShareLink(data)
  showShareModal.value = true
  copied.value = false
}

const copyShareLink = async () => {
  const success = await copyToClipboard(shareLink.value)
  if (success) {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey) {
    if (event.key === 'z' && !event.shiftKey) {
      event.preventDefault()
      handleUndo()
    } else if ((event.key === 'z' && event.shiftKey) || event.key === 'y') {
      event.preventDefault()
      handleRedo()
    }
  }
  
  if (event.key === 'Escape') {
    clearSelection()
    setTool('select')
  }
  
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (selectedId.value && !isPlaying.value && !isRecording.value) {
      const target = event.target as HTMLElement
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        event.preventDefault()
        handleDeleteElement(selectedId.value)
      }
    }
  }
}

const handleResize = () => {
  isSidebarCollapsed.value = window.innerWidth < 1000
}

const loadShareFromUrl = async () => {
  const shareHash = route.query.share as string
  if (shareHash) {
    const data = await loadShareData(shareHash)
    if (data) {
      setElements(data.elements)
      initHistory()
      
      if (data.timeline) {
        timeline.value = data.timeline
        if (animationEngine) {
          animationEngine.setKeyframes(data.timeline.keyframes, data.timeline.duration)
        }
      }
      
      router.replace({ query: {} })
      return true
    }
  }
  return false
}

const loadAutoSave = () => {
  const saved = loadFromLocal<ExportData | null>('autosave', null)
  if (saved && saved.elements) {
    setElements(saved.elements)
    
    if (saved.timeline) {
      timeline.value = saved.timeline
    }
  }
  initHistory()
}

const autoSave = () => {
  const data: ExportData = {
    version: '1.0.0',
    elements: elements.value,
    timeline: timeline.value,
    exportedAt: Date.now()
  }
  saveToLocal('autosave', data)
}

let autoSaveTimer: number | null = null

onMounted(async () => {
  initAnimationEngine()
  
  const loaded = await loadShareFromUrl()
  if (!loaded) {
    loadAutoSave()
  }
  
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleResize)
  handleResize()
  
  autoSaveTimer = window.setInterval(autoSave, 5000)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleResize)
  
  if (autoSaveTimer !== null) {
    clearInterval(autoSaveTimer)
  }
  
  autoSave()
})
</script>

<style scoped>
.editor-view {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.editor-header {
  height: 50px;
  background: rgba(26, 26, 46, 0.95);
  border-bottom: 1px solid #33333a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  backdrop-filter: blur(10px);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
}

.logo-icon {
  color: #e94560;
  font-size: 18px;
}

.header-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #888;
}

.element-count,
.keyframe-count {
  padding: 4px 10px;
  background: #252538;
  border-radius: 4px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: #252538;
  border-radius: 12px;
  padding: 24px;
  width: 480px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-content h3 {
  font-size: 18px;
  margin-bottom: 8px;
  color: #fff;
}

.modal-desc {
  font-size: 13px;
  color: #888;
  margin-bottom: 20px;
}

.share-link {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.share-link input {
  flex: 1;
  padding: 10px 12px;
  background: #1a1a2e;
  border: 1px solid #33333a;
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  font-family: 'Monaco', 'Consolas', monospace;
}

.copy-btn {
  padding: 10px 20px;
  background: #e94560;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease-out;
  white-space: nowrap;
}

.copy-btn:hover {
  background: #d63850;
}

.close-btn {
  width: 100%;
  padding: 10px;
  background: transparent;
  color: #888;
  border: 1px solid #33333a;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease-out;
}

.close-btn:hover {
  border-color: #555;
  color: #fff;
}

.sidebar-collapsed .toolbar {
  width: 60px;
}
</style>
