<template>
  <div
    ref="canvasRef"
    class="prototype-stage"
    @mousedown="handleCanvasMouseDown"
    @mousemove="handleCanvasMouseMove"
    @mouseup="handleCanvasMouseUp"
    @mouseleave="handleCanvasMouseUp"
  >
    <div class="canvas-grid"></div>

    <div class="canvas-content">
      <div
        v-for="element in displayElements"
        :key="element.id"
        class="canvas-element"
        :class="{
          selected: selectedId === element.id,
          'is-dragging': dragState.elementId === element.id && dragState.type === 'move',
          'is-resizing': dragState.elementId === element.id && dragState.type === 'resize',
          [`type-${element.type}`]: true
        }"
        :style="getElementStyle(element)"
        @mousedown.stop="handleElementMouseDown($event, element)"
        @mouseenter="handleElementHover(element.id, true)"
        @mouseleave="handleElementHover(element.id, false)"
        @click.stop="handleElementClick(element)"
      >
        <div class="element-content">
          <template v-if="element.type === 'button'">
            <button class="btn-element">{{ element.label }}</button>
          </template>
          <template v-else-if="element.type === 'card'">
            <div class="card-element">
              <div class="card-title">{{ element.label }}</div>
              <div class="card-body">卡片内容区域</div>
            </div>
          </template>
          <template v-else-if="element.type === 'modal'">
            <div class="modal-element">
              <div class="modal-header">
                <span>{{ element.label }}</span>
                <span class="modal-close">×</span>
              </div>
              <div class="modal-body">弹窗内容</div>
              <div class="modal-footer">
                <button class="modal-btn cancel">取消</button>
                <button class="modal-btn confirm">确定</button>
              </div>
            </div>
          </template>
          <template v-else-if="element.type === 'slider'">
            <div class="slider-element">
              <div class="slider-track">
                <div class="slider-fill" style="width: 50%"></div>
                <div class="slider-thumb" style="left: 50%"></div>
              </div>
            </div>
          </template>
        </div>

        <template v-if="selectedId === element.id && !isPlaying && !isRecording">
          <div class="resize-handle handle-nw" data-handle="nw" @mousedown.stop="handleResizeStart($event, element, 'nw')"></div>
          <div class="resize-handle handle-n" data-handle="n" @mousedown.stop="handleResizeStart($event, element, 'n')"></div>
          <div class="resize-handle handle-ne" data-handle="ne" @mousedown.stop="handleResizeStart($event, element, 'ne')"></div>
          <div class="resize-handle handle-e" data-handle="e" @mousedown.stop="handleResizeStart($event, element, 'e')"></div>
          <div class="resize-handle handle-se" data-handle="se" @mousedown.stop="handleResizeStart($event, element, 'se')"></div>
          <div class="resize-handle handle-s" data-handle="s" @mousedown.stop="handleResizeStart($event, element, 's')"></div>
          <div class="resize-handle handle-sw" data-handle="sw" @mousedown.stop="handleResizeStart($event, element, 'sw')"></div>
          <div class="resize-handle handle-w" data-handle="w" @mousedown.stop="handleResizeStart($event, element, 'w')"></div>
        </template>
      </div>
    </div>

    <div v-if="isRecording" class="recording-indicator">
      <span class="recording-dot"></span>
      正在录制...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PrototypeElement, ToolType, ElementStyle } from '@/types'
import { snapToGrid, clamp } from '@/utils/helpers'

const props = defineProps<{
  elements: PrototypeElement[]
  selectedId: string | null
  currentTool: ToolType
  isPlaying: boolean
  isRecording: boolean
}>()

const emit = defineEmits<{
  (e: 'select', id: string | null): void
  (e: 'add-element', type: string, x: number, y: number): void
  (e: 'update-element', id: string, updates: Partial<PrototypeElement>): void
  (e: 'update-element-history', id: string, updates: Partial<PrototypeElement>): void
  (e: 'record-keyframe', elementId: string, property: keyof ElementStyle | 'interaction', value: number | string, interactionType?: string): void
}>()

const canvasRef = ref<HTMLElement | null>(null)

interface DragState {
  isDragging: boolean
  elementId: string | null
  type: 'move' | 'resize' | null
  handle: string | null
  startX: number
  startY: number
  startStyle: ElementStyle | null
  hasMoved: boolean
}

const dragState = ref<DragState>({
  isDragging: false,
  elementId: null,
  type: null,
  handle: null,
  startX: 0,
  startY: 0,
  startStyle: null,
  hasMoved: false
})

const hoveredElements = ref<Set<string>>(new Set())

const displayElements = computed(() => props.elements)

const getElementStyle = (element: PrototypeElement) => {
  const { x, y, width, height, rotation, opacity } = element.style
  return {
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    transform: `rotate(${rotation}deg)`,
    opacity: opacity / 100
  }
}

const getCanvasCoords = (event: MouseEvent) => {
  if (!canvasRef.value) return { x: 0, y: 0 }
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
}

const handleCanvasMouseDown = (event: MouseEvent) => {
  if (props.isPlaying) return

  const coords = getCanvasCoords(event)

  if (props.currentTool !== 'select') {
    const snappedX = snapToGrid(coords.x - 60)
    const snappedY = snapToGrid(coords.y - 20)
    emit('add-element', props.currentTool, snappedX, snappedY)
    return
  }

  emit('select', null)
}

const handleCanvasMouseMove = (event: MouseEvent) => {
  if (!dragState.value.isDragging || !dragState.value.elementId || !dragState.value.startStyle) {
    return
  }

  const coords = getCanvasCoords(event)
  const dx = coords.x - dragState.value.startX
  const dy = coords.y - dragState.value.startY

  if (!dragState.value.hasMoved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
    dragState.value.hasMoved = true
  }

  if (dragState.value.type === 'move') {
    const newX = snapToGrid(dragState.value.startStyle.x + dx)
    const newY = snapToGrid(dragState.value.startStyle.y + dy)

    emit('update-element', dragState.value.elementId, {
      style: { x: newX, y: newY }
    })

    if (props.isRecording && dragState.value.hasMoved) {
      emit('record-keyframe', dragState.value.elementId, 'x', newX)
      emit('record-keyframe', dragState.value.elementId, 'y', newY)
    }
  } else if (dragState.value.type === 'resize') {
    const handle = dragState.value.handle
    const start = dragState.value.startStyle
    let newX = start.x
    let newY = start.y
    let newWidth = start.width
    let newHeight = start.height

    const snappedDx = snapToGrid(dx)
    const snappedDy = snapToGrid(dy)

    if (handle?.includes('e')) {
      newWidth = Math.max(20, start.width + snappedDx)
    }
    if (handle?.includes('w')) {
      newWidth = Math.max(20, start.width - snappedDx)
      newX = start.x + start.width - newWidth
    }
    if (handle?.includes('s')) {
      newHeight = Math.max(20, start.height + snappedDy)
    }
    if (handle?.includes('n')) {
      newHeight = Math.max(20, start.height - snappedDy)
      newY = start.y + start.height - newHeight
    }

    emit('update-element', dragState.value.elementId, {
      style: { x: newX, y: newY, width: newWidth, height: newHeight }
    })

    if (props.isRecording && dragState.value.hasMoved) {
      emit('record-keyframe', dragState.value.elementId, 'x', newX)
      emit('record-keyframe', dragState.value.elementId, 'y', newY)
      emit('record-keyframe', dragState.value.elementId, 'width', newWidth)
      emit('record-keyframe', dragState.value.elementId, 'height', newHeight)
    }
  }
}

const handleCanvasMouseUp = () => {
  if (dragState.value.isDragging && dragState.value.hasMoved && dragState.value.elementId) {
    const element = props.elements.find((e) => e.id === dragState.value.elementId)
    if (element) {
      emit('update-element-history', dragState.value.elementId, {
        style: { ...element.style }
      })
    }
  }

  dragState.value = {
    isDragging: false,
    elementId: null,
    type: null,
    handle: null,
    startX: 0,
    startY: 0,
    startStyle: null,
    hasMoved: false
  }
}

const handleElementMouseDown = (event: MouseEvent, element: PrototypeElement) => {
  if (props.isPlaying) return
  if (props.currentTool !== 'select') return

  dragState.value = {
    isDragging: true,
    elementId: element.id,
    type: 'move',
    handle: null,
    startX: event.clientX - element.style.x,
    startY: event.clientY - element.style.y,
    startStyle: { ...element.style },
    hasMoved: false
  }

  const coords = getCanvasCoords(event)
  dragState.value.startX = coords.x
  dragState.value.startY = coords.y

  emit('select', element.id)
}

const handleResizeStart = (event: MouseEvent, element: PrototypeElement, handle: string) => {
  if (props.isPlaying) return
  event.stopPropagation()

  const coords = getCanvasCoords(event)

  dragState.value = {
    isDragging: true,
    elementId: element.id,
    type: 'resize',
    handle,
    startX: coords.x,
    startY: coords.y,
    startStyle: { ...element.style },
    hasMoved: false
  }
}

const handleElementClick = (element: PrototypeElement) => {
  if (props.isPlaying) return
  if (dragState.value.hasMoved) return

  if (props.isRecording) {
    emit('record-keyframe', element.id, 'interaction', 'click', 'click')
  }
}

const handleElementHover = (elementId: string, isHovering: boolean) => {
  if (isHovering) {
    hoveredElements.value.add(elementId)
  } else {
    hoveredElements.value.delete(elementId)
  }
}

watch(
  () => props.selectedId,
  (newId) => {
    if (newId && props.isRecording) {
      const element = props.elements.find((e) => e.id === newId)
      if (element) {
        const propsToRecord: (keyof ElementStyle)[] = ['x', 'y', 'width', 'height', 'rotation', 'opacity']
        propsToRecord.forEach((prop) => {
          emit('record-keyframe', element.id, prop, element.style[prop])
        })
      }
    }
  }
)
</script>

<style scoped>
.prototype-stage {
  flex: 1;
  position: relative;
  overflow: auto;
  background: #1a1a2e;
}

.canvas-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    linear-gradient(#33333a 1px, transparent 1px),
    linear-gradient(90deg, #33333a 1px, transparent 1px);
  background-size: 50px 50px;
  pointer-events: none;
  opacity: 0.5;
}

.canvas-content {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 1200px;
  min-height: 800px;
}

.canvas-element {
  position: absolute;
  cursor: move;
  transition: box-shadow 0.2s ease-out;
  user-select: none;
}

.canvas-element.selected {
  z-index: 10;
}

.canvas-element.selected::after {
  content: '';
  position: absolute;
  top: -6px;
  left: -6px;
  right: -6px;
  bottom: -6px;
  border-radius: 8px;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.6);
  animation: glowPulse 2s ease-in-out infinite;
  pointer-events: none;
  z-index: -1;
}

@keyframes glowPulse {
  0%, 100% {
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.6);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 0 20px 4px rgba(59, 130, 246, 0.4);
  }
}

.canvas-element.is-dragging,
.canvas-element.is-resizing {
  transition: none;
  cursor: grabbing;
}

.element-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.btn-element {
  width: 100%;
  height: 100%;
  background: #e94560;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-out;
}

.btn-element:hover {
  background: #d63850;
  transform: translateY(-1px);
}

.card-element {
  width: 100%;
  height: 100%;
  background: #252538;
  border: 1px solid #33333a;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.card-title {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: rgba(233, 69, 96, 0.1);
  border-bottom: 1px solid #33333a;
}

.card-body {
  flex: 1;
  padding: 12px 16px;
  font-size: 12px;
  color: #888;
}

.modal-element {
  width: 100%;
  height: 100%;
  background: #252538;
  border: 1px solid #33333a;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #0f3460;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-close {
  font-size: 18px;
  color: #888;
  cursor: pointer;
}

.modal-body {
  flex: 1;
  padding: 16px;
  font-size: 13px;
  color: #aaa;
}

.modal-footer {
  padding: 10px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #33333a;
}

.modal-btn {
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease-out;
}

.modal-btn.cancel {
  background: #33333a;
  color: #aaa;
}

.modal-btn.confirm {
  background: #e94560;
  color: #fff;
}

.slider-element {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 8px;
}

.slider-track {
  width: 100%;
  height: 6px;
  background: #33333a;
  border-radius: 3px;
  position: relative;
}

.slider-fill {
  height: 100%;
  background: #e94560;
  border-radius: 3px;
  position: absolute;
  left: 0;
  top: 0;
}

.slider-thumb {
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #fff;
  border: 2px solid #3b82f6;
  border-radius: 2px;
  z-index: 20;
}

.handle-nw {
  top: -5px;
  left: -5px;
  cursor: nw-resize;
}

.handle-n {
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  cursor: n-resize;
}

.handle-ne {
  top: -5px;
  right: -5px;
  cursor: ne-resize;
}

.handle-e {
  top: 50%;
  right: -5px;
  transform: translateY(-50%);
  cursor: e-resize;
}

.handle-se {
  bottom: -5px;
  right: -5px;
  cursor: se-resize;
}

.handle-s {
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  cursor: s-resize;
}

.handle-sw {
  bottom: -5px;
  left: -5px;
  cursor: sw-resize;
}

.handle-w {
  top: 50%;
  left: -5px;
  transform: translateY(-50%);
  cursor: w-resize;
}

.recording-indicator {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 8px 16px;
  background: rgba(233, 69, 96, 0.2);
  border: 1px solid #e94560;
  border-radius: 20px;
  color: #e94560;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 100;
}

.recording-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e94560;
  animation: recordingBlink 1s ease-in-out infinite;
}

@keyframes recordingBlink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
