export interface TimeRange {
  startTime: string
  endTime: string
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function formatTime(time: string): string {
  return time
}

export function formatDuration(startTime: string, endTime: string): string {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  const diff = end - start
  const hours = Math.floor(diff / 60)
  const minutes = diff % 60
  if (hours > 0 && minutes > 0) {
    return `${hours}小时${minutes}分钟`
  } else if (hours > 0) {
    return `${hours}小时`
  } else {
    return `${minutes}分钟`
  }
}

export function calculatePixelWidth(
  startTime: string,
  endTime: string,
  totalWidth: number,
  totalMinutes: number = 1440
): number {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  const duration = end - start
  return (duration / totalMinutes) * totalWidth
}

export function calculatePixelLeft(
  startTime: string,
  totalWidth: number,
  totalMinutes: number = 1440
): number {
  const start = timeToMinutes(startTime)
  return (start / totalMinutes) * totalWidth
}

export function isTimeConflict(task1: TimeRange, task2: TimeRange): boolean {
  const start1 = timeToMinutes(task1.startTime)
  const end1 = timeToMinutes(task1.endTime)
  const start2 = timeToMinutes(task2.startTime)
  const end2 = timeToMinutes(task2.endTime)
  return start1 < end2 && start2 < end1
}

export function getCurrentTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function isValidTimeRange(startTime: string, endTime: string): boolean {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  return end > start && start >= 0 && end <= 1440
}
