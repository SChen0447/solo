<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useTaskStore, type Task } from '@/store/taskStore'
import {
  calculatePixelWidth,
  calculatePixelLeft,
  formatDuration,
  getCurrentTime
} from '@/utils/timeUtils'
import { useDrag } from '@/composables/useDrag'

const emit = defineEmits<{
  (e: 'editTask', task: Task): void
}>()

const taskStore = useTaskStore()

const timelineRef = ref<HTMLElement | null>(null)
const timelineWidth = ref(0)
const currentTime = ref(getCurrentTime())
const hoveredTask = ref<Task | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })

let timeInterval: number | null = null
let resizeObserver: ResizeObserver | null = null

const {
  isDragging,
  dragType,
  dragStartTime,
  dragEndTime,
  taskId: dragTaskId,
  handleMouseDown
} = useDrag(1000, 1440, 4)

const hours = computed(() => {
  return Array.from({ length: 25 }, (_, i) => i)
})

const displayTasks = computed(() => {
  if (!isDragging.value || !dragTaskId.value) {
    return taskStore.sortedTasks
  }

  return taskStore.sortedTasks.map(task => {
    if (task.id === dragTaskId.value) {
      return {
        ...task,
        startTime: dragStartTime.value,
        endTime: dragEndTime.value
      }
    }
    return task
  })
})

const currentTimeLeft = computed(() => {
  return calculatePixelLeft(currentTime.value, timelineWidth)
})

function getTaskLeft(task: Task): number {
  return calculatePixelLeft(task.startTime, timelineWidth)
}

function getTaskWidth(task: Task): number {
  return calculatePixelWidth(task.startTime, task.endTime, timelineWidth)
}

const priorityColors: Record<string, string> = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#22c55e'
}

function getPriorityColor(priority: string): string {
  return priorityColors[priority] || '#6366f1'
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级'
  }
  return labels[priority] || '未知'
}

function handleTaskHover(task: Task, e: MouseEvent) {
  hoveredTask.value = task
  updateTooltipPosition(e)
}

function updateTooltipPosition(e: MouseEvent) {
  if (!timelineRef.value) return
  const rect = timelineRef.value.getBoundingClientRect()
  tooltipPosition.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

function handleTaskMouseLeave() {
  hoveredTask.value = null
}

function handleTaskMouseMove(e: MouseEvent) {
  if (hoveredTask.value) {
    updateTooltipPosition(e)
  }
}

function handleDragStart(e: MouseEvent, type: 'start' | 'end' | 'move', task: Task) {
  handleMouseDown(e, type, {
    id: task.id,
    startTime: task.startTime,
    endTime: task.endTime
  })
}

function handleDragEnd() {
  if (isDragging.value && dragTaskId.value) {
    const result = taskStore.updateTaskTime(
      dragTaskId.value,
      dragStartTime.value,
      dragEndTime.value
    )
    if (!result.success) {
      // 冲突时保持拖拽回退
    }
  }
}

watch(isDragging, (val) => {
  if (!val) {
    handleDragEnd()
  }
})

function handleTaskClick(task: Task) {
  if (!isDragging.value) {
    emit('editTask', task)
  }
}

function updateTimelineWidth() {
  if (timelineRef.value) {
    timelineWidth.value = timelineRef.value.offsetWidth
  }
}

onMounted(() => {
  updateTimelineWidth()

  timeInterval = window.setInterval(() => {
    currentTime.value = getCurrentTime()
  }, 1000)

  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      updateTimelineWidth()
    })
    if (timelineRef.value) {
      resizeObserver.observe(timelineRef.value)
    }
  } else {
    window.addEventListener('resize', updateTimelineWidth)
  }
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
  } else {
    window.removeEventListener('resize', updateTimelineWidth)
  }
})
</script>

<template>
  <div class="timeline-wrapper">
    <div class="timeline-header">
      <h1>今日待办</h1>
      <div class="date-display">
        <span class="current-date">{{ new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }) }}</span>
      </div>
    </div>

    <div class="timeline-container" ref="timelineRef" @mousemove="handleTaskMouseMove">
      <div class="time-scale">
        <div
          v-for="hour in hours"
          :key="hour"
          class="time-label"
          :style="{ left: (hour / 24) * 100 + '%' }"
        >
          <span class="hour-text">{{ String(hour).padStart(2, '0') }}:00</span>
          <span class="tick-mark"></span>
        </div>
      </div>

      <div class="timeline-track">
        <div class="track-bg"></div>

        <div class="track-grid">
          <div
            v-for="hour in hours"
            :key="hour"
            class="grid-line"
            :style="{ left: (hour / 24) * 100 + '%' }"
          ></div>
        </div>

        <div
          v-for="task in displayTasks"
          :key="task.id"
          class="task-block"
          :class="{
            'is-conflicted': taskStore.isTaskConflicted(task.id),
            'is-dragging': isDragging && dragTaskId === task.id
          }"
          :style="{
              left: getTaskLeft(task) + 'px',
              width: getTaskWidth(task) + 'px',
              '--task-color': getPriorityColor(task.priority)
            }"
          @mouseenter="handleTaskHover(task, $event)"
          @mouseleave="handleTaskMouseLeave"
          @click="handleTaskClick(task)"
        >
          <div
            class="drag-handle drag-handle-left"
            @mousedown="handleDragStart($event, 'start', task)"
          ></div>

          <div
            class="task-content"
            @mousedown="handleDragStart($event, 'move', task)"
          >
            <span class="task-title">{{ task.title }}</span>
            <span class="task-duration">{{ formatDuration(task.startTime, task.endTime) }}</span>
          </div>

          <div
            class="drag-handle drag-handle-right"
            @mousedown="handleDragStart($event, 'end', task)"
          ></div>
        </div>

        <div
          class="current-time-indicator"
          :style="{ left: currentTimeLeft + 'px' }"
        >
          <div class="time-dot"></div>
          <div class="time-line"></div>
          <div class="time-label-current">{{ currentTime }}</div>
        </div>
      </div>

      <Transition name="tooltip">
        <div
          v-if="hoveredTask && !isDragging"
          class="task-tooltip"
          :style="{
            left: tooltipPosition.x + 'px',
            top: tooltipPosition.y + 'px'
          }"
        >
          <div class="tooltip-header">
          <span class="tooltip-priority" :style="{ background: getPriorityColor(hoveredTask.priority) }"></span>
          <span class="tooltip-title">{{ hoveredTask.title }}</span>
        </div>
        <div class="tooltip-body">
          <div class="tooltip-row">
            <span class="tooltip-label">优先级</span>
            <span class="tooltip-value">{{ getPriorityLabel(hoveredTask.priority) }}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">时间段</span>
            <span class="tooltip-value">{{ hoveredTask.startTime }} - {{ hoveredTask.endTime }}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">时长</span>
            <span class="tooltip-value">{{ formatDuration(hoveredTask.startTime, hoveredTask.endTime) }}</span>
          </div>
          <div v-if="hoveredTask.note" class="tooltip-note">
            <span class="tooltip-label">备注</span>
            <p class="tooltip-note-text">{{ hoveredTask.note }}</p>
          </div>
        </div>
      </div>
      </Transition>
    </div>

    <div class="legend">
      <div class="legend-item">
        <span class="legend-dot" style="background: #ef4444;"></span>
        <span>高优先级</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #f97316;"></span>
        <span>中优先级</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #22c55e;"></span>
        <span>低优先级</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-wrapper {
  width: 100%;
  padding: 0 20px;
  box-sizing: border-box;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.timeline-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
}

.date-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-date {
  font-size: 15px;
  color: #9ca3af;
}

.timeline-container {
  position: relative;
  width: 100%;
}

.time-scale {
  position: relative;
  height: 30px;
  margin-bottom: 8px;
}

.time-label {
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.hour-text {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}

.tick-mark {
  width: 1px;
  height: 6px;
  background: #4b5563;
}

.timeline-track {
  position: relative;
  height: 80px;
  border-radius: 12px;
  overflow: visible;
}

.track-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.track-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.grid-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  border-left: 1px dashed rgba(255, 255, 255, 0.08);
}

.task-block {
  position: absolute;
  top: 8px;
  height: 64px;
  border-radius: 8px;
  background: var(--task-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: grab;
  user-select: none;
  transition: box-shadow 0.2s, transform 0.1s;
  display: flex;
  align-items: center;
  overflow: hidden;
  min-width: 40px;
}

.task-block:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  transform: translateY(-1px);
}

.task-block.is-dragging {
  cursor: grabbing;
  opacity: 0.9;
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.task-block.is-conflicted {
  animation: conflict-pulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 0 2px #ef4444, 0 4px 12px rgba(239, 68, 68, 0.4);
}

@keyframes conflict-pulse {
  0%, 100% {
    box-shadow: 0 0 0 2px #ef4444, 0 4px 12px rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 0 0 3px #ef4444, 0 6px 16px rgba(239, 68, 68, 0.6);
  }
}

.drag-handle {
  width: 8px;
  height: 100%;
  cursor: ew-resize;
  flex-shrink: 0;
  position: relative;
}

.drag-handle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 3px;
  height: 24px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.drag-handle:hover::after {
  opacity: 1;
}

.task-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8px 10px;
  overflow: hidden;
  white-space: nowrap;
}

.task-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-duration {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 2px;
}

.current-time-indicator {
  position: absolute;
  top: -8px;
  bottom: -8px;
  width: 2px;
  z-index: 20;
  pointer-events: none;
}

.time-dot {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.time-line {
  position: absolute;
  top: 10px;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  background: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
}

.time-label-current {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 600;
  color: #ef4444;
  background: #1e1e2e;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.task-tooltip {
  position: absolute;
  transform: translate(-50%, -100%);
  margin-top: -12px;
  background: #2a2a3e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px 14px;
  min-width: 200px;
  max-width: 280px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 100;
  pointer-events: none;
}

.tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tooltip-priority {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tooltip-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.tooltip-label {
  font-size: 12px;
  color: #9ca3af;
  flex-shrink: 0;
}

.tooltip-value {
  font-size: 12px;
  color: #e5e7eb;
  text-align: right;
}

.tooltip-note {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.tooltip-note-text {
  margin: 4px 0 0;
  font-size: 12px;
  color: #d1d5db;
  line-height: 1.5;
  word-break: break-word;
}

.legend {
  display: flex;
  gap: 20px;
  margin-top: 20px;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #9ca3af;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}

@media (max-width: 1023px) and (min-width: 768px) {
  .timeline-header h1 {
    font-size: 24px;
  }

  .hour-text {
    font-size: 11px;
  }

  .task-title {
    font-size: 12px;
  }

  .task-duration {
    font-size: 10px;
  }
}

@media (max-width: 767px) {
  .timeline-wrapper {
    padding: 0 16px;
  }

  .timeline-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 20px;
  }

  .timeline-header h1 {
    font-size: 22px;
  }

  .timeline-container {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }

  .timeline-track {
    width: 200%;
  }

  .time-scale {
    width: 200%;
  }

  .hour-text {
    font-size: 11px;
    font-weight: 600;
  }

  .task-title {
    font-size: 12px;
  }

  .task-duration {
    font-size: 10px;
  }

  .legend {
    flex-wrap: wrap;
    gap: 12px 16px;
  }
}
</style>
