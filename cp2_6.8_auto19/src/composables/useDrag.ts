import { ref, onUnmounted } from 'vue'
import { minutesToTime, timeToMinutes } from '@/utils/timeUtils'

export type DragType = 'start' | 'end' | 'move' | null

export interface DragState {
  isDragging: boolean
  dragType: DragType
  startTime: string
  endTime: string
}

export function useDrag(
  totalWidth: number,
  totalMinutes: number = 1440,
  minGapMinutes: number = 4
) {
  const isDragging = ref(false)
  const dragType = ref<DragType>(null)
  const dragStartTime = ref('')
  const dragEndTime = ref('')
  const taskId = ref('')

  let startX = 0
  let initialStartTime = ''
  let initialEndTime = ''
  let rafId: number | null = null

  function pixelsToMinutes(pixels: number): number {
    return Math.round((pixels / totalWidth) * totalMinutes)
  }

  function snapToMinutes(minutes: number): number {
    return Math.round(minutes / 5) * 5
  }

  function handleMouseDown(
    e: MouseEvent,
    type: DragType,
    task: { id: string; startTime: string; endTime: string }
  ) {
    e.preventDefault()
    e.stopPropagation()

    isDragging.value = true
    dragType.value = type
    taskId.value = task.id
    startX = e.clientX
    initialStartTime = task.startTime
    initialEndTime = task.endTime
    dragStartTime.value = task.startTime
    dragEndTime.value = task.endTime

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging.value || !dragType.value) return

    if (rafId !== null) {
      cancelAnimationFrame(rafId)
    }

    rafId = requestAnimationFrame(() => {
      const deltaX = e.clientX - startX
      const deltaMinutes = pixelsToMinutes(deltaX)
      const snappedDelta = snapToMinutes(deltaMinutes)

      let newStart = timeToMinutes(initialStartTime)
      let newEnd = timeToMinutes(initialEndTime)

      if (dragType.value === 'start') {
        newStart = Math.max(0, Math.min(newEnd - minGapMinutes, newStart + snappedDelta))
      } else if (dragType.value === 'end') {
        newEnd = Math.min(totalMinutes, Math.max(newStart + minGapMinutes, newEnd + snappedDelta))
      } else if (dragType.value === 'move') {
        const duration = newEnd - newStart
        newStart = Math.max(0, Math.min(totalMinutes - duration, newStart + snappedDelta))
        newEnd = newStart + duration
      }

      dragStartTime.value = minutesToTime(newStart)
      dragEndTime.value = minutesToTime(newEnd)
    })
  }

  function handleMouseUp() {
    isDragging.value = false
    dragType.value = null

    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)

    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function applyNeighborsAvoidance(
    tasks: Array<{ id: string; startTime: string; endTime: string }>,
    currentTaskId: string,
    newStartTime: string,
    newEndTime: string
  ): Array<{ id: string; startTime: string; endTime: string }> {
    const result = tasks.map(t => ({ ...t }))
    const current = result.find(t => t.id === currentTaskId)
    if (!current) return result

    current.startTime = newStartTime
    current.endTime = newEndTime

    const sorted = [...result].sort((a, b) =>
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    )

    for (let i = 0; i < sorted.length; i++) {
      const task = sorted[i]
      if (task.id === currentTaskId) continue

      const prev = sorted[i - 1]
      if (prev) {
        const prevEnd = timeToMinutes(prev.endTime)
        const taskStart = timeToMinutes(task.startTime)
        const gap = taskStart - prevEnd
        if (gap < minGapMinutes) {
          const pushForward = minGapMinutes - gap
          const taskEnd = timeToMinutes(task.endTime)
          const duration = taskEnd - taskStart
          const newStart = Math.min(
            totalMinutes - duration,
            taskStart + pushForward
          )
          task.startTime = minutesToTime(newStart)
          task.endTime = minutesToTime(newStart + duration)
        }
      }
    }

    for (let i = sorted.length - 1; i >= 0; i--) {
      const task = sorted[i]
      if (task.id === currentTaskId) continue

      const next = sorted[i + 1]
      if (next) {
        const nextStart = timeToMinutes(next.startTime)
        const taskEnd = timeToMinutes(task.endTime)
        const gap = nextStart - taskEnd
        if (gap < minGapMinutes) {
          const pushBackward = minGapMinutes - gap
          const taskStart = timeToMinutes(task.startTime)
          const duration = taskEnd - taskStart
          const newEnd = Math.max(duration, taskEnd - pushBackward)
          task.endTime = minutesToTime(newEnd)
          task.startTime = minutesToTime(newEnd - duration)
        }
      }
    }

    return result
  }

  onUnmounted(() => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
    }
  })

  return {
    isDragging,
    dragType,
    dragStartTime,
    dragEndTime,
    taskId,
    handleMouseDown,
    applyNeighborsAvoidance
  }
}
