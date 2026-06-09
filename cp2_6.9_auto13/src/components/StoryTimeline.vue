<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

interface Props {
  total: number
  currentIndex: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:currentIndex', value: number): void
}>()

const timelineRef = ref<HTMLElement | null>(null)
const sliderRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)

const stepWidth = computed(() => {
  return props.total > 1 ? 100 / (props.total - 1) : 100
})

const sliderPosition = computed(() => {
  return props.currentIndex * stepWidth.value
})

function handleDragStart(e: MouseEvent | TouchEvent) {
  isDragging.value = true
  updateIndexFromEvent(e)
  window.addEventListener('mousemove', handleDragMove)
  window.addEventListener('mouseup', handleDragEnd)
  window.addEventListener('touchmove', handleDragMove)
  window.addEventListener('touchend', handleDragEnd)
}

function handleDragMove(e: MouseEvent | TouchEvent) {
  if (!isDragging.value) return
  updateIndexFromEvent(e)
}

function handleDragEnd() {
  isDragging.value = false
  window.removeEventListener('mousemove', handleDragMove)
  window.removeEventListener('mouseup', handleDragEnd)
  window.removeEventListener('touchmove', handleDragMove)
  window.removeEventListener('touchend', handleDragEnd)
}

function updateIndexFromEvent(e: MouseEvent | TouchEvent) {
  if (!timelineRef.value) return
  const rect = timelineRef.value.getBoundingClientRect()
  let clientX: number
  if ('touches' in e) {
    clientX = e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0
  } else {
    clientX = e.clientX
  }
  const x = clientX - rect.left
  const percentage = Math.max(0, Math.min(1, x / rect.width))
  const newIndex = Math.round(percentage * (props.total - 1))
  if (newIndex !== props.currentIndex) {
    emit('update:currentIndex', newIndex)
  }
}

function handleStepClick(index: number) {
  emit('update:currentIndex', index)
}

onMounted(() => {
  sliderRef.value?.addEventListener('mousedown', handleDragStart)
  sliderRef.value?.addEventListener('touchstart', handleDragStart, { passive: true })
})

onUnmounted(() => {
  sliderRef.value?.removeEventListener('mousedown', handleDragStart)
  sliderRef.value?.removeEventListener('touchstart', handleDragStart)
  window.removeEventListener('mousemove', handleDragMove)
  window.removeEventListener('mouseup', handleDragEnd)
  window.removeEventListener('touchmove', handleDragMove)
  window.removeEventListener('touchend', handleDragEnd)
})
</script>

<template>
  <div class="timeline-container">
    <div class="timeline-track" ref="timelineRef" @click="(e) => { isDragging = false; updateIndexFromEvent(e) }">
      <div class="timeline-progress" :style="{ width: `${sliderPosition}%" }"></div>
      <div
        v-for="(_, index) in total"
        :key="index"
        class="step-marker"
        :class="{ active: index === currentIndex }"
        :style="{ left: `${index * stepWidth}%` }"
        @click.stop="handleStepClick(index)"
      >
        <div v-if="index === currentIndex" class="rotating-ring"></div>
        <div class="marker-dot"></div>
      </div>
      <div
        ref="sliderRef"
        class="timeline-slider"
        :style="{ left: `${sliderPosition}%" }"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.timeline-container {
  width: 80%;
  margin: 0 auto;
  user-select: none;
}

.timeline-track {
  position: relative;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  cursor: pointer;
}

.timeline-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 2px;
  transition: width 300ms ease;
  pointer-events: none;
}

.step-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 2;
}

.marker-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  transition: all 300ms ease;
}

.step-marker.active .marker-dot {
  width: 16px;
  height: 16px;
  background: #ffffff;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.6);
}

.rotating-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 30px;
  height: 30px;
  margin: -15px 0 0 -15px;
  border: 2px solid transparent;
  border-top-color: rgba(255, 255, 255, 0.7);
  border-right-color: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  animation: rotateRing 2s linear infinite;
  pointer-events: none;
}

@keyframes rotateRing {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.timeline-slider {
  position: absolute;
  top: 50%;
  width: 24px;
  height: 24px;
  margin-left: -12px;
  margin-top: -12px;
  background: #ffffff;
  border-radius: 50%;
  cursor: grab;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
  transition: left 100ms ease-out;
  z-index: 3;
}

.timeline-slider:active {
  cursor: grabbing;
}

@media (max-width: 768px) {
  .timeline-container {
    width: 95%;
  }
}
</style>
