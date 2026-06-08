<template>
  <div
    ref="canvasContainer"
    class="canvas-container"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @touchstart.prevent="handleTouchStart"
    @touchmove.prevent="handleTouchMove"
    @touchend.prevent="handleTouchEnd"
  >
    <div class="background-layer" :class="config.bgType">
      <div v-if="config.bgType === 'gradient'" class="bg-gradient" :style="gradientStyle"></div>
      <div v-if="config.bgType === 'grid'" class="bg-grid"></div>
      <div v-if="config.bgType === 'stars'" class="bg-stars">
        <div
          v-for="star in stars"
          :key="star.id"
          class="star"
          :style="getStarStyle(star)"
        ></div>
      </div>
      <div class="bg-transition"></div>
    </div>

    <svg ref="svgRef" :width="canvasSize.width" :height="canvasSize.height" class="gesture-svg">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        v-for="(segment, index) in gesture.pathSegments.value"
        :key="'path-' + index"
        :d="getSegmentPath(segment)"
        :stroke="config.lineColor"
        :stroke-width="config.lineWidth"
        fill="none"
        stroke-linecap="round"
        filter="url(#glow)"
        class="path-segment"
      />

      <path
        v-if="gesture.isDrawing.value && gesture.path.value.length > 0"
        :d="getCurrentLinePath()"
        :stroke="config.lineColor"
        :stroke-width="config.lineWidth"
        fill="none"
        stroke-linecap="round"
        opacity="0.6"
        stroke-dasharray="8,4"
      />

      <g v-for="node in gesture.nodes.value" :key="'node-' + node.id" @mousedown.stop="">
        <circle
          v-if="rippleNodeId === node.id"
          :cx="node.x"
          :cy="node.y"
          :r="rippleRadius"
          fill="none"
          :stroke="node.color"
          stroke-width="2"
          :opacity="rippleOpacity"
          class="ripple"
        />

        <circle
          :cx="node.x"
          :cy="node.y"
          :r="config.nodeSize"
          :fill="node.color"
          filter="url(#glow)"
          class="node-circle"
          :class="{ active: gesture.path.value.includes(node.id) }"
          @click.stop="handleNodeClick(node)"
          @mousedown.stop="handleNodeMouseDown(node, $event)"
        />

        <circle
          :cx="node.x"
          :cy="node.y"
          :r="config.nodeSize * 0.4"
          fill="#1a1a2e"
          class="node-inner"
        />
      </g>
    </svg>

    <transition name="color-picker">
      <div
        v-if="showColorPicker"
        class="color-picker-popup"
        :style="colorPickerPosition"
      >
        <div class="color-picker-inner">
          <div
            v-for="color in palette"
            :key="color"
            class="color-option"
            :style="{ backgroundColor: color }"
            @click="selectColor(color)"
          ></div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import type { Node, PathSegment, GestureConfig } from '../types'
import { COLOR_PALETTE } from '../types'

const props = defineProps<{
  config: GestureConfig
  gesture: ReturnType<typeof import('../composables/useGesture').useGesture>
  palette?: string[]
}>()

const emit = defineEmits<{
  (e: 'node-color-change', nodeId: number, color: string): void
  (e: 'path-complete'): void
}>()

const canvasContainer = ref<HTMLDivElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const canvasSize = reactive({ width: 400, height: 400 })
const showColorPicker = ref(false)
const selectedNodeId = ref<number | null>(null)
const colorPickerPosition = reactive({ top: '0px', left: '0px' })
const rippleNodeId = ref<number | null>(null)
const rippleRadius = ref(0)
const rippleOpacity = ref(0)
const draggingNode = ref<Node | null>(null)
const dragOffset = reactive({ x: 0, y: 0 })

const palette = computed(() => props.palette || COLOR_PALETTE)

interface Star {
  id: number
  x: number
  y: number
  size: number
  delay: number
  duration: number
}

const stars = ref<Star[]>([])

const initStars = () => {
  const starList: Star[] = []
  for (let i = 0; i < 50; i++) {
    starList.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 4
    })
  }
  stars.value = starList
}

const getStarStyle = (star: Star) => {
  return {
    left: star.x + '%',
    top: star.y + '%',
    width: star.size + 'px',
    height: star.size + 'px',
    animationDelay: star.delay + 's',
    animationDuration: star.duration + 's'
  }
}

const gradientStyle = computed(() => ({
  background: `radial-gradient(circle at center, ${props.config.bgGradientStart} 0%, ${props.config.bgGradientEnd} 100%)`
}))

const getSegmentPath = (segment: PathSegment): string => {
  const fromNode = props.gesture.nodes.value.find(n => n.id === segment.from)
  const toNode = props.gesture.nodes.value.find(n => n.id === segment.to)

  if (!fromNode || !toNode) return ''

  const progress = segment.progress
  const currentX = fromNode.x + (toNode.x - fromNode.x) * progress
  const currentY = fromNode.y + (toNode.y - fromNode.y) * progress

  const midX = (fromNode.x + currentX) / 2
  const midY = (fromNode.y + currentY) / 2
  const dx = currentX - fromNode.x
  const dy = currentY - fromNode.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const curveAmount = Math.min(dist * 0.2, 30)

  const ctrlX = midX - dy * curveAmount / dist * 0.5
  const ctrlY = midY + dx * curveAmount / dist * 0.5

  return `M ${fromNode.x} ${fromNode.y} Q ${ctrlX} ${ctrlY} ${currentX} ${currentY}`
}

const getCurrentLinePath = (): string => {
  const lastNodeId = props.gesture.path.value[props.gesture.path.value.length - 1]
  const lastNode = props.gesture.nodes.value.find(n => n.id === lastNodeId)
  if (!lastNode) return ''

  const midX = (lastNode.x + props.gesture.currentMousePos.x) / 2
  const midY = (lastNode.y + props.gesture.currentMousePos.y) / 2
  const dx = props.gesture.currentMousePos.x - lastNode.x
  const dy = props.gesture.currentMousePos.y - lastNode.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const curveAmount = Math.min(dist * 0.2, 30)

  const ctrlX = midX - dy * curveAmount / dist * 0.5
  const ctrlY = midY + dx * curveAmount / dist * 0.5

  return `M ${lastNode.x} ${lastNode.y} Q ${ctrlX} ${ctrlY} ${props.gesture.currentMousePos.x} ${props.gesture.currentMousePos.y}`
}

const handleMouseDown = (e: MouseEvent) => {
  if (showColorPicker.value) {
    showColorPicker.value = false
    return
  }
  const rect = canvasContainer.value?.getBoundingClientRect()
  if (!rect) return
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  props.gesture.startDrawing(x, y, props.config.nodeSize)
}

const handleMouseMove = (e: MouseEvent) => {
  const rect = canvasContainer.value?.getBoundingClientRect()
  if (!rect) return
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  if (draggingNode.value) {
    draggingNode.value.x = x - dragOffset.x
    draggingNode.value.y = y - dragOffset.y
    return
  }

  props.gesture.continueDrawing(x, y, props.config.nodeSize)
}

const handleMouseUp = () => {
  if (draggingNode.value) {
    draggingNode.value = null
    return
  }
  props.gesture.endDrawing()
  if (props.gesture.isValidPath.value) {
    emit('path-complete')
  }
}

const handleTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0]
  const rect = canvasContainer.value?.getBoundingClientRect()
  if (!rect) return
  const x = touch.clientX - rect.left
  const y = touch.clientY - rect.top
  props.gesture.startDrawing(x, y, props.config.nodeSize)
}

const handleTouchMove = (e: TouchEvent) => {
  const touch = e.touches[0]
  const rect = canvasContainer.value?.getBoundingClientRect()
  if (!rect) return
  const x = touch.clientX - rect.left
  const y = touch.clientY - rect.top
  props.gesture.continueDrawing(x, y, props.config.nodeSize)
}

const handleTouchEnd = () => {
  props.gesture.endDrawing()
  if (props.gesture.isValidPath.value) {
    emit('path-complete')
  }
}

const handleNodeClick = (node: Node) => {
  selectedNodeId.value = node.id
  showColorPicker.value = true
  colorPickerPosition.left = node.x + 'px'
  colorPickerPosition.top = node.y + 'px'
  triggerRipple(node.id)
}

const handleNodeMouseDown = (node: Node, e: MouseEvent) => {
  const rect = canvasContainer.value?.getBoundingClientRect()
  if (!rect) return
  draggingNode.value = node
  dragOffset.x = e.clientX - rect.left - node.x
  dragOffset.y = e.clientY - rect.top - node.y
}

const triggerRipple = (nodeId: number) => {
  rippleNodeId.value = nodeId
  rippleRadius.value = props.config.nodeSize
  rippleOpacity.value = 1

  const animate = () => {
    rippleRadius.value += 2
    rippleOpacity.value -= 0.02

    if (rippleOpacity.value > 0) {
      requestAnimationFrame(animate)
    } else {
      rippleNodeId.value = null
    }
  }

  requestAnimationFrame(animate)
}

const selectColor = (color: string) => {
  if (selectedNodeId.value !== null) {
    props.gesture.setNodeColor(selectedNodeId.value, color)
    emit('node-color-change', selectedNodeId.value, color)
  }
  showColorPicker.value = false
}

const updateCanvasSize = () => {
  if (!canvasContainer.value) return
  const rect = canvasContainer.value.getBoundingClientRect()
  const size = Math.min(rect.width, rect.height)
  canvasSize.width = size
  canvasSize.height = size
  props.gesture.updateNodePositions()
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  initStars()
  updateCanvasSize()
  props.gesture.initNodes()

  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(updateCanvasSize)
    if (canvasContainer.value) {
      resizeObserver.observe(canvasContainer.value)
    }
  } else {
    window.addEventListener('resize', updateCanvasSize)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  } else {
    window.removeEventListener('resize', updateCanvasSize)
  }
})

watch(() => props.config.nodeSize, () => {
  if (selectedNodeId.value !== null) {
    const node = props.gesture.nodes.value.find(n => n.id === selectedNodeId.value)
    if (node) {
      colorPickerPosition.left = node.x + 'px'
      colorPickerPosition.top = node.y + 'px'
    }
  }
})

defineExpose({
  svgRef,
  canvasSize
})
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: crosshair;
  user-select: none;
}

.background-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.bg-gradient {
  position: absolute;
  inset: 0;
  transition: all 0.5s ease;
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(233, 69, 96, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(233, 69, 96, 0.1) 1px, transparent 1px);
  background-size: 20px 20px;
  background-color: #1a1a2e;
  transition: opacity 0.5s ease;
}

.bg-stars {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #0f0f23 0%, #1a1a2e 100%);
  overflow: hidden;
}

.star {
  position: absolute;
  background: white;
  border-radius: 50%;
  animation: starFloat 8s ease-in-out infinite;
}

@keyframes starFloat {
  0%, 100% {
    opacity: 0.3;
    transform: translateY(0) scale(1);
  }
  50% {
    opacity: 1;
    transform: translateY(-10px) scale(1.2);
  }
}

.bg-transition {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 0%, rgba(26, 26, 46, 0.8) 100%);
  pointer-events: none;
  transition: opacity 0.5s ease;
}

.gesture-svg {
  position: relative;
  z-index: 1;
}

.path-segment {
  transition: stroke 0.3s ease;
}

.node-circle {
  cursor: pointer;
  transition: all 0.2s ease;
}

.node-circle:hover {
  filter: url(#glow) brightness(1.2);
  transform: scale(1.1);
}

.node-circle.active {
  filter: url(#glow) brightness(1.3);
}

.node-inner {
  pointer-events: none;
}

.ripple {
  pointer-events: none;
}

.color-picker-popup {
  position: absolute;
  z-index: 100;
  transform: translate(-50%, -50%);
}

.color-picker-inner {
  display: grid;
  grid-template-columns: repeat(8, 24px);
  gap: 6px;
  padding: 12px;
  background: #16213e;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(233, 69, 96, 0.3);
}

.color-option {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.color-option:hover {
  transform: scale(1.2);
  border-color: #fff;
}

.color-picker-enter-active {
  animation: colorPickerExpand 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.color-picker-leave-active {
  animation: colorPickerCollapse 0.3s ease;
}

@keyframes colorPickerExpand {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

@keyframes colorPickerCollapse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }
}
</style>
