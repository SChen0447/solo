<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import type { CoffeeBean, FlavorDimension } from '../types/coffee'
import { FLAVOR_DIMENSIONS } from '../types/coffee'

const props = defineProps<{
  coffee: CoffeeBean | null
  compareCoffee: CoffeeBean | null
}>()

const emit = defineEmits<{
  (e: 'segment-update', data: { dimension: FlavorDimension; intensity: number; note: string }): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const inputPanelRef = ref<HTMLDivElement | null>(null)
const rotation = ref(0)
const isDragging = ref(false)
const dragStartAngle = ref(0)
const dragStartRotation = ref(0)
const segmentOpacities = ref<number[]>([1, 1, 1, 1, 1, 1])
const activeSegment = ref<FlavorDimension | null>(null)
const panelPosition = ref({ x: 0, y: 0 })
const intensityValue = ref(5)
const noteValue = ref('')
const animFrame = ref<number>(0)

const centerX = 250
const centerY = 250
const outerRadius = 200
const innerRadius = 60
const segmentCount = 6
const anglePerSegment = (Math.PI * 2) / segmentCount

const currentFlavor = computed(() => {
  if (!props.coffee) return FLAVOR_DIMENSIONS.map(() => 0)
  return FLAVOR_DIMENSIONS.map(d => props.coffee!.flavor[d.key])
})

const compareFlavor = computed(() => {
  if (!props.compareCoffee) return null
  return FLAVOR_DIMENSIONS.map(d => props.compareCoffee!.flavor[d.key])
})

function getAngleForSegment(index: number): number {
  return rotation.value + index * anglePerSegment - Math.PI / 2
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 200, g: 130, b: 66 }
}

function drawRadarPolygon(
  ctx: CanvasRenderingContext2D,
  values: number[],
  color: string,
  opacity: number,
  dashed: boolean,
  fill: boolean
) {
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.beginPath()
  for (let i = 0; i < segmentCount; i++) {
    const angle = getAngleForSegment(i)
    const radius = innerRadius + ((outerRadius - innerRadius) * values[i]) / 10
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  if (fill) {
    const rgb = hexToRgb(color)
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`
    ctx.fill()
  }
  if (dashed) ctx.setLineDash([6, 4])
  ctx.strokeStyle = color
  ctx.lineWidth = dashed ? 2.5 : 3
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  index: number,
  value: number,
  color: string,
  opacity: number
) {
  const startAngle = getAngleForSegment(index) - anglePerSegment / 2
  const endAngle = getAngleForSegment(index) + anglePerSegment / 2
  const valueRadius = innerRadius + ((outerRadius - innerRadius) * value) / 10

  ctx.save()
  ctx.globalAlpha = opacity

  ctx.beginPath()
  ctx.moveTo(centerX, centerY)
  ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle)
  ctx.closePath()
  const rgb = hexToRgb(color)
  ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`
  ctx.fill()
  ctx.strokeStyle = '#644a38'
  ctx.lineWidth = 0.5
  ctx.stroke()

  if (value > 0) {
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.arc(centerX, centerY, valueRadius, startAngle, endAngle)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.globalAlpha = opacity * 0.7
    ctx.fill()
  }

  const midAngle = getAngleForSegment(index)
  const labelRadius = outerRadius + 30
  const labelX = centerX + Math.cos(midAngle) * labelRadius
  const labelY = centerY + Math.sin(midAngle) * labelRadius
  ctx.globalAlpha = opacity
  ctx.fillStyle = '#f5efe6'
  ctx.font = 'bold 14px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(FLAVOR_DIMENSIONS[index].label, labelX, labelY)

  const valueRadiusLabel = outerRadius + 50
  const valueX = centerX + Math.cos(midAngle) * valueRadiusLabel
  const valueY = centerY + Math.sin(midAngle) * valueRadiusLabel
  ctx.fillStyle = '#c88242'
  ctx.font = '12px -apple-system, sans-serif'
  ctx.fillText(String(value), valueX, valueY)

  ctx.restore()
}

function drawTicks(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.strokeStyle = '#644a38'
  ctx.lineWidth = 0.5
  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * Math.PI * 2 - Math.PI / 2
    const isMajor = i % 6 === 0
    const inner = outerRadius + 2
    const outer = outerRadius + (isMajor ? 12 : 6)
    ctx.beginPath()
    ctx.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner)
    ctx.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer)
    ctx.stroke()
  }
  ctx.restore()
}

function drawCenter(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2)
  const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, innerRadius)
  grad.addColorStop(0, '#3a2e24')
  grad.addColorStop(1, '#1e1814')
  ctx.fillStyle = grad
  ctx.fill()
  ctx.strokeStyle = '#c88242'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const name = props.coffee?.name || '请选择咖啡豆'
  ctx.fillText(name, centerX, centerY - 8)

  if (props.coffee) {
    ctx.fillStyle = '#a89888'
    ctx.font = '11px -apple-system, sans-serif'
    ctx.fillText(`${props.coffee.origin} · ${props.coffee.roastLevel}`, centerX, centerY + 14)
  }
  ctx.restore()
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.strokeStyle = 'rgba(100, 74, 56, 0.3)'
  ctx.lineWidth = 0.5
  for (let level = 2; level <= 10; level += 2) {
    const r = innerRadius + ((outerRadius - innerRadius) * level) / 10
    ctx.beginPath()
    for (let i = 0; i < segmentCount; i++) {
      const angle = getAngleForSegment(i)
      const x = centerX + Math.cos(angle) * r
      const y = centerY + Math.sin(angle) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }
  for (let i = 0; i < segmentCount; i++) {
    const angle = getAngleForSegment(i)
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(
      centerX + Math.cos(angle) * outerRadius,
      centerY + Math.sin(angle) * outerRadius
    )
    ctx.stroke()
  }
  ctx.restore()
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, 500, 500)

  drawTicks(ctx)

  for (let i = 0; i < segmentCount; i++) {
    drawSegment(
      ctx,
      i,
      currentFlavor.value[i],
      FLAVOR_DIMENSIONS[i].color,
      segmentOpacities.value[i]
    )
  }

  drawGrid(ctx)

  drawRadarPolygon(
    ctx,
    currentFlavor.value,
    '#c88242',
    0.9,
    false,
    true
  )

  if (compareFlavor.value && props.compareCoffee) {
    drawRadarPolygon(
      ctx,
      compareFlavor.value,
      '#ff7f50',
      0.7,
      true,
      false
    )
  }

  for (let i = 0; i < segmentCount; i++) {
    const angle = getAngleForSegment(i)
    const r = innerRadius + ((outerRadius - innerRadius) * currentFlavor.value[i]) / 10
    const x = centerX + Math.cos(angle) * r
    const y = centerY + Math.sin(angle) * r
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#f5efe6'
    ctx.fill()
    ctx.strokeStyle = FLAVOR_DIMENSIONS[i].color
    ctx.lineWidth = 2
    ctx.stroke()
  }

  drawCenter(ctx)
}

function animateTransition() {
  segmentOpacities.value = [0, 0, 0, 0, 0, 0]
  const startTime = performance.now()
  const totalDuration = 300
  const staggerDelay = 50

  function step(now: number) {
    const elapsed = now - startTime
    let anyAnimating = false
    for (let i = 0; i < segmentCount; i++) {
      const delay = i * staggerDelay
      const segElapsed = elapsed - delay
      if (segElapsed <= 0) {
        segmentOpacities.value[i] = 0
        anyAnimating = true
      } else if (segElapsed >= totalDuration) {
        segmentOpacities.value[i] = 1
      } else {
        const t = segElapsed / totalDuration
        segmentOpacities.value[i] = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        anyAnimating = true
      }
    }
    draw()
    if (anyAnimating) {
      animFrame.value = requestAnimationFrame(step)
    }
  }
  animFrame.value = requestAnimationFrame(step)
}

function getMousePos(e: MouseEvent | Touch): { x: number; y: number } {
  const canvas = canvasRef.value
  if (!canvas) return { x: 0, y: 0 }
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: ((e.clientX - rect.left) * scaleX),
    y: ((e.clientY - rect.top) * scaleY)
  }
}

function hitTest(mouseX: number, mouseY: number): number | null {
  const dx = mouseX - centerX
  const dy = mouseY - centerY
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < innerRadius || dist > outerRadius + 40) return null

  let angle = Math.atan2(dy, dx) + Math.PI / 2 - rotation.value
  while (angle < 0) angle += Math.PI * 2
  while (angle >= Math.PI * 2) angle -= Math.PI * 2

  const index = Math.floor((angle + anglePerSegment / 2) / anglePerSegment) % segmentCount
  return index
}

function onMouseDown(e: MouseEvent) {
  isDragging.value = true
  const pos = getMousePos(e)
  dragStartAngle.value = Math.atan2(pos.y - centerY, pos.x - centerX)
  dragStartRotation.value = rotation.value
}

function onMouseMove(e: MouseEvent) {
  const pos = getMousePos(e)
  if (isDragging.value) {
    const currentAngle = Math.atan2(pos.y - centerY, pos.x - centerX)
    rotation.value = dragStartRotation.value + (currentAngle - dragStartAngle.value)
    draw()
  } else {
    const idx = hitTest(pos.x, pos.y)
    const canvas = canvasRef.value
    if (canvas) {
      canvas.style.cursor = idx !== null ? 'pointer' : 'default'
    }
  }
}

function onMouseUp(e: MouseEvent) {
  if (!isDragging.value) return
  isDragging.value = false
  const pos = getMousePos(e)
  const moved = Math.abs(
    Math.atan2(pos.y - centerY, pos.x - centerX) - dragStartAngle.value
  )
  if (moved < 0.05) {
    const idx = hitTest(pos.x, pos.y)
    if (idx !== null && props.coffee) {
      openInputPanel(FLAVOR_DIMENSIONS[idx].key, e)
    }
  }
}

function onMouseLeave() {
  isDragging.value = false
}

function openInputPanel(dimension: FlavorDimension, e: MouseEvent) {
  activeSegment.value = dimension
  if (props.coffee) {
    intensityValue.value = props.coffee.flavor[dimension]
    noteValue.value = props.coffee.notes?.[dimension] || ''
  }
  const canvas = canvasRef.value
  if (canvas) {
    const rect = canvas.getBoundingClientRect()
    panelPosition.value = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }
}

function closePanel() {
  activeSegment.value = null
}

function confirmPanel() {
  if (!activeSegment.value || !props.coffee) return
  emit('segment-update', {
    dimension: activeSegment.value,
    intensity: intensityValue.value,
    note: noteValue.value
  })
  closePanel()
}

watch(() => props.coffee?.id, () => {
  nextTick(() => animateTransition())
}, { immediate: true })

watch([rotation, currentFlavor, compareFlavor, () => props.coffee], () => {
  draw()
}, { deep: true })

onMounted(() => {
  draw()
  window.addEventListener('resize', draw)
})

onUnmounted(() => {
  window.removeEventListener('resize', draw)
  if (animFrame.value) cancelAnimationFrame(animFrame.value)
})

defineExpose({ draw })
</script>

<template>
  <div class="flavor-wheel-container">
    <canvas
      ref="canvasRef"
      width="500"
      height="500"
      class="flavor-canvas"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseLeave"
    />
    <Transition name="panel">
      <div
        v-if="activeSegment"
        ref="inputPanelRef"
        class="input-panel"
        :style="{
          left: `${Math.min(panelPosition.x + 10, 300)}px`,
          top: `${Math.min(panelPosition.y + 10, 380)}px`
        }"
        @click.stop
      >
        <div class="panel-header">
          <span class="panel-title">
            {{ FLAVOR_DIMENSIONS.find(d => d.key === activeSegment)?.label }}
          </span>
          <button class="panel-close" @click="closePanel">×</button>
        </div>
        <div class="panel-body">
          <div class="intensity-row">
            <label>强度</label>
            <input
              type="range"
              min="1"
              max="10"
              v-model.number="intensityValue"
              class="intensity-slider"
            />
            <span class="intensity-value">{{ intensityValue }}</span>
          </div>
          <div class="note-row">
            <label>品鉴笔记</label>
            <textarea
              v-model="noteValue"
              class="note-input"
              rows="2"
              placeholder="记录风味感受..."
            />
          </div>
          <button class="confirm-btn" @click="confirmPanel">确认</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.flavor-wheel-container {
  position: relative;
  display: inline-block;
  user-select: none;
}

.flavor-canvas {
  display: block;
  width: 500px;
  height: 500px;
  touch-action: none;
}

.input-panel {
  position: absolute;
  width: 240px;
  background: #fff8e7;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  color: #1e1814;
  z-index: 100;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(200, 130, 66, 0.15);
  border-bottom: 1px solid rgba(200, 130, 66, 0.3);
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
  color: #5a3a1a;
}

.panel-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #8b6a4a;
  line-height: 1;
  transition: color 0.2s ease-out;
}

.panel-close:hover {
  color: #c44d58;
}

.panel-body {
  padding: 14px;
}

.intensity-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.intensity-row label {
  font-size: 12px;
  color: #6b5a4a;
  min-width: 40px;
}

.intensity-slider {
  flex: 1;
  accent-color: #c88242;
}

.intensity-value {
  min-width: 24px;
  text-align: center;
  font-weight: 700;
  color: #c88242;
}

.note-row {
  margin-bottom: 12px;
}

.note-row label {
  display: block;
  font-size: 12px;
  color: #6b5a4a;
  margin-bottom: 6px;
}

.note-input {
  width: 100%;
  border: 1px solid rgba(200, 130, 66, 0.3);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
  font-family: inherit;
  resize: none;
  background: rgba(255, 255, 255, 0.6);
  outline: none;
  transition: border-color 0.2s ease-out;
}

.note-input:focus {
  border-color: #c88242;
}

.confirm-btn {
  width: 100%;
  padding: 8px;
  background: #c88242;
  color: #fff8e7;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease-out, transform 0.2s ease-out;
}

.confirm-btn:hover {
  background: #b87232;
  transform: translateY(-1px);
}

.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-4px);
}

@media (max-width: 1024px) {
  .flavor-canvas {
    width: min(90vw, 400px);
    height: min(90vw, 400px);
  }
}
</style>
