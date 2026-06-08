<template>
  <div class="canvas-wrapper" ref="canvasWrapper">
    <div class="canvas-container" ref="canvasContainer" :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }">
      <svg
        class="grid-svg"
        :width="canvasWidth"
        :height="canvasHeight"
        :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"
      >
        <defs>
          <pattern id="grid" :width="gridSize" :height="gridSize" patternUnits="userSpaceOnUse">
            <path :d="`M ${gridSize} 0 L 0 0 0 ${gridSize}`" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <svg
        class="patterns-svg"
        :width="canvasWidth"
        :height="canvasHeight"
        :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"
        @mousedown="handleCanvasMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
        @dblclick="handleCanvasDoubleClick"
      >
        <g
          v-for="pattern in displayPatterns"
          :key="pattern.id"
          :transform="getPatternTransform(pattern)"
          :style="getPatternStyle(pattern)"
          class="pattern-group"
          :class="{ selected: selectedId === pattern.id, dragging: draggingId === pattern.id }"
          @mousedown.stop="handlePatternMouseDown($event, pattern.id)"
          @dblclick.stop="handlePatternDoubleClick(pattern.id)"
        >
          <component :is="getPatternComponent(pattern.type)" :pattern="pattern" />
        </g>

        <g>
          <circle
            v-for="(particle, idx) in particles"
            :key="idx"
            :cx="particle.x"
            :cy="particle.y"
            :r="particle.radius"
            :fill="particle.color"
            :opacity="particle.opacity"
          />
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, h, defineComponent } from 'vue'
import type { PropType } from 'vue'

export interface PatternData {
  id: number
  type: string
  x: number
  y: number
  rotation: number
  scale: number
  opacity: number
  colorIndex: number
  morphProgress?: number
  morphTargetType?: string
  isAnimating?: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  opacity: number
  life: number
  maxLife: number
}

const props = defineProps<{
  patterns: PatternData[]
  selectedId: number | null
  colors: string[]
}>()

const emit = defineEmits<{
  (e: 'select', id: number | null): void
  (e: 'update:patterns', patterns: PatternData[]): void
  (e: 'property-panel', id: number, x: number, y: number): void
}>()

const canvasWrapper = ref<HTMLElement | null>(null)
const canvasContainer = ref<HTMLElement | null>(null)
const canvasWidth = ref(900)
const canvasHeight = ref(600)
const gridSize = computed(() => canvasWidth.value / 12)

const draggingId = ref<number | null>(null)
const dragOffset = ref({ x: 0, y: 0 })
const displayPatterns = ref<PatternData[]>([])

const particles = ref<Particle[]>([])
let animationFrameId: number | null = null
let particleAnimationId: number | null = null

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

function lerpColor(color1: string, color2: string, t: string): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  const numT = Number(t)
  return rgbToHex(
    lerp(c1.r, c2.r, numT),
    lerp(c1.g, c2.g, numT),
    lerp(c1.b, c2.b, numT)
  )
}

const patternTypes = ['circle', 'square', 'triangle', 'hexagon', 'star', 'spiral', 'wave', 'dots']

watch(() => props.patterns, (newPatterns) => {
  displayPatterns.value = newPatterns.map(p => ({ ...p, morphProgress: p.morphProgress ?? 0, isAnimating: p.isAnimating ?? false }))
}, { deep: true, immediate: true })

function snapToGrid(value: number): number {
  const size = gridSize.value
  return Math.round(value / size) * size
}

function getPatternTransform(pattern: PatternData): string {
  return `translate(${pattern.x}, ${pattern.y}) rotate(${pattern.rotation}) scale(${pattern.scale})`
}

function getPatternStyle(pattern: PatternData): Record<string, string> {
  const colorIndex = pattern.colorIndex % props.colors.length
  return {
    '--pattern-color': props.colors[colorIndex],
    opacity: String(pattern.opacity)
  }
}

function getPatternComponent(type: string): any {
  return defineComponent({
    props: {
      pattern: { type: Object as PropType<PatternData>, required: true }
    },
    setup() {
      return () => {
        const color = `var(--pattern-color)`
        switch (type) {
          case 'circle':
            return h('circle', { cx: 0, cy: 0, r: 30, fill: color, class: 'pattern-shape' })
          case 'square':
            return h('rect', { x: -30, y: -30, width: 60, height: 60, fill: color, class: 'pattern-shape' })
          case 'triangle':
            return h('polygon', { points: '0,-35 30,25 -30,25', fill: color, class: 'pattern-shape' })
          case 'hexagon':
            const hexPoints = []
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i - Math.PI / 2
              hexPoints.push(`${30 * Math.cos(angle)},${30 * Math.sin(angle)}`)
            }
            return h('polygon', { points: hexPoints.join(' '), fill: color, class: 'pattern-shape' })
          case 'star':
            const starPoints = []
            for (let i = 0; i < 10; i++) {
              const angle = (Math.PI / 5) * i - Math.PI / 2
              const r = i % 2 === 0 ? 35 : 15
              starPoints.push(`${r * Math.cos(angle)},${r * Math.sin(angle)}`)
            }
            return h('polygon', { points: starPoints.join(' '), fill: color, class: 'pattern-shape' })
          case 'spiral':
            let spiralPath = 'M 0 0 '
            for (let i = 0; i <= 720; i += 10) {
              const angle = (i * Math.PI) / 180
              const r = (i / 720) * 30
              spiralPath += `L ${r * Math.cos(angle)} ${r * Math.sin(angle)} `
            }
            return h('path', { d: spiralPath, stroke: color, 'stroke-width': 3, fill: 'none', class: 'pattern-shape' })
          case 'wave':
            let wavePath = 'M -35 0 '
            for (let i = -35; i <= 35; i += 2) {
              const y = Math.sin((i / 35) * Math.PI * 2) * 12
              wavePath += `L ${i} ${y} `
            }
            return h('path', { d: wavePath, stroke: color, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round', class: 'pattern-shape' })
          case 'dots':
            const dots = []
            for (let row = 0; row < 5; row++) {
              for (let col = 0; col < 5; col++) {
                const dx = -24 + col * 12
                const dy = -24 + row * 12
                dots.push(h('circle', { cx: dx, cy: dy, r: 4, fill: color, key: `${row}-${col}` }))
              }
            }
            return h('g', { class: 'pattern-shape' }, dots)
          default:
            return h('circle', { cx: 0, cy: 0, r: 30, fill: color, class: 'pattern-shape' })
        }
      }
    }
  })
}

function handleCanvasMouseDown(e: MouseEvent): void {
  emit('select', null)
}

function handlePatternMouseDown(e: MouseEvent, id: number): void {
  e.preventDefault()
  emit('select', id)
  draggingId.value = id

  const pattern = displayPatterns.value.find(p => p.id === id)
  if (pattern) {
    const svgRect = (e.currentTarget as HTMLElement).closest('svg')?.getBoundingClientRect()
    if (svgRect) {
      dragOffset.value = {
        x: e.clientX - svgRect.left - pattern.x,
        y: e.clientY - svgRect.top - pattern.y
      }
    }
  }
}

function handleMouseMove(e: MouseEvent): void {
  if (draggingId.value === null) return

  const svg = document.querySelector('.patterns-svg') as SVGSVGElement
  if (!svg) return

  const rect = svg.getBoundingClientRect()
  let newX = e.clientX - rect.left - dragOffset.value.x
  let newY = e.clientY - rect.top - dragOffset.value.y

  newX = Math.max(30, Math.min(canvasWidth.value - 30, newX))
  newY = Math.max(30, Math.min(canvasHeight.value - 30, newY))

  const snappedX = snapToGrid(newX)
  const snappedY = snapToGrid(newY)

  const patterns = [...displayPatterns.value]
  const idx = patterns.findIndex(p => p.id === draggingId.value)
  if (idx !== -1) {
    patterns[idx] = { ...patterns[idx], x: snappedX, y: snappedY }
    displayPatterns.value = patterns
  }
}

function handleMouseUp(): void {
  if (draggingId.value !== null) {
    emit('update:patterns', displayPatterns.value)
    draggingId.value = null
  }
}

let lastClickTime = 0
let clickTimeout: ReturnType<typeof setTimeout> | null = null

function handleCanvasDoubleClick(): void {
  // noop
}

function handlePatternDoubleClick(id: number): void {
  triggerMorphAnimation(id)
}

function triggerMorphAnimation(id: number): void {
  const pattern = displayPatterns.value.find(p => p.id === id)
  if (!pattern || pattern.isAnimating) return

  const availableTypes = patternTypes.filter(t => t !== pattern.type)
  const targetType = availableTypes[Math.floor(Math.random() * availableTypes.length)]
  const targetColorIndex = (pattern.colorIndex + 1 + Math.floor(Math.random() * (props.colors.length - 1))) % props.colors.length

  const patterns = [...displayPatterns.value]
  const idx = patterns.findIndex(p => p.id === id)
  if (idx !== -1) {
    patterns[idx] = {
      ...patterns[idx],
      morphProgress: 0,
      morphTargetType: targetType,
      isAnimating: true
    }
    displayPatterns.value = patterns
  }

  const duration = 1000
  const startTime = performance.now()
  const startColorIndex = pattern.colorIndex

  spawnParticles(pattern.x, pattern.y, props.colors[startColorIndex % props.colors.length])

  function animate(currentTime: number): void {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = easeInOutCubic(progress)

    const patterns = [...displayPatterns.value]
    const idx = patterns.findIndex(p => p.id === id)
    if (idx !== -1) {
      patterns[idx] = {
        ...patterns[idx],
        morphProgress: easedProgress
      }

      const colorProgress = easedProgress
      const colorIdx = Math.floor(lerp(startColorIndex, targetColorIndex, colorProgress) + 0.5)
      patterns[idx].colorIndex = colorIdx

      displayPatterns.value = patterns
    }

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate)
    } else {
      const finalPatterns = [...displayPatterns.value]
      const finalIdx = finalPatterns.findIndex(p => p.id === id)
      if (finalIdx !== -1) {
        finalPatterns[finalIdx] = {
          ...finalPatterns[finalIdx],
          type: targetType,
          morphProgress: 0,
          morphTargetType: undefined,
          isAnimating: false,
          colorIndex: targetColorIndex
        }
        displayPatterns.value = finalPatterns
        emit('update:patterns', finalPatterns)
      }
    }
  }

  animationFrameId = requestAnimationFrame(animate)
}

function spawnParticles(x: number, y: number, color: string): void {
  const particleCount = 30
  const newParticles: Particle[] = []

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5
    const speed = 1 + Math.random() * 3
    newParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 4,
      color,
      opacity: 1,
      life: 0,
      maxLife: 800
    })
  }

  particles.value = [...particles.value, ...newParticles]

  if (!particleAnimationId) {
    animateParticles()
  }
}

function animateParticles(): void {
  const startTime = performance.now()
  let lastTime = startTime

  function update(currentTime: number): void {
    const deltaTime = currentTime - lastTime
    lastTime = currentTime

    particles.value = particles.value
      .map(p => {
        p.life += deltaTime
        const progress = p.life / p.maxLife
        p.opacity = Math.max(0, 1 - progress)
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05
        p.radius *= 0.995
        return p
      })
      .filter(p => p.life < p.maxLife && p.opacity > 0)

    if (particles.value.length > 0) {
      particleAnimationId = requestAnimationFrame(update)
    } else {
      particleAnimationId = null
    }
  }

  particleAnimationId = requestAnimationFrame(update)
}

function updateCanvasSize(): void {
  if (canvasWrapper.value) {
    const width = canvasWrapper.value.clientWidth
    canvasWidth.value = Math.floor(width * 0.75)
    canvasHeight.value = Math.floor(canvasWidth.value * 0.65)
  }
}

onMounted(() => {
  updateCanvasSize()
  window.addEventListener('resize', updateCanvasSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasSize)
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  if (particleAnimationId) {
    cancelAnimationFrame(particleAnimationId)
  }
  if (clickTimeout) {
    clearTimeout(clickTimeout)
  }
})

defineExpose({
  canvasWidth,
  canvasHeight,
  displayPatterns
})
</script>

<style scoped>
.canvas-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  box-sizing: border-box;
}

.canvas-container {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.grid-svg,
.patterns-svg {
  position: absolute;
  top: 0;
  left: 0;
}

.grid-svg {
  pointer-events: none;
  z-index: 1;
}

.patterns-svg {
  z-index: 2;
  cursor: default;
}

.pattern-group {
  cursor: grab;
  transition: filter 0.2s ease;
}

.pattern-group:hover {
  filter: brightness(1.15) drop-shadow(0 0 8px currentColor);
}

.pattern-group.selected .pattern-shape {
  stroke: white;
  stroke-width: 2;
  stroke-dasharray: 6 4;
  paint-order: stroke;
}

.pattern-group.dragging {
  cursor: grabbing;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4));
}

.pattern-shape {
  transition: fill 0.3s ease;
}
</style>
