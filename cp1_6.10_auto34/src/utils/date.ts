import { format, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, differenceInDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { CheckInRecord, DayCellData, Habit } from '@/types'

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatTime(date: Date): string {
  return format(date, 'HH:mm:ss')
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

export function getMonthDays(date: Date): Date[] {
  return eachDayOfInterval({
    start: startOfMonth(date),
    end: endOfMonth(date),
  })
}

export function getWeekdayName(date: Date): string {
  return format(date, 'EEEE', { locale: zhCN })
}

export function getMonthName(date: Date): string {
  return format(date, 'yyyy年MM月', { locale: zhCN })
}

export function nextMonth(date: Date): Date {
  return addMonths(date, 1)
}

export function prevMonth(date: Date): Date {
  return subMonths(date, 1)
}

export function calculateStreak(habitId: string, records: CheckInRecord[]): number {
  const habitRecords = records
    .filter((r) => r.habitId === habitId && r.completedMinutes > 0)
    .map((r) => new Date(r.date))
    .sort((a, b) => b.getTime() - a.getTime())

  if (habitRecords.length === 0) return 0

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let checkDate = today
  for (const recordDate of habitRecords) {
    const rd = new Date(recordDate)
    rd.setHours(0, 0, 0, 0)
    const diff = differenceInDays(checkDate, rd)
    if (diff === 0 || diff === 1) {
      streak++
      checkDate = rd
    } else if (diff > 1) {
      break
    }
  }

  return streak
}

export function getCompletionColor(percent: number): string {
  if (percent <= 0) return '#2d2d44'
  if (percent < 34) return '#2d6a4f'
  if (percent < 67) return '#40916c'
  if (percent < 100) return '#52b788'
  return '#00d2d3'
}

export function buildDayCells(habitId: string, month: Date, records: CheckInRecord[], targetMinutes: number): DayCellData[] {
  const days = getMonthDays(month)
  return days.map((date) => {
    const dateStr = formatDate(date)
    const dayRecords = records.filter(
      (r) => r.habitId === habitId && r.date === dateStr
    )
    const completedMinutes = dayRecords.reduce((sum, r) => sum + r.completedMinutes, 0)
    const percent = targetMinutes > 0 ? Math.min(100, (completedMinutes / targetMinutes) * 100) : 0

    return {
      date: dateStr,
      completed: completedMinutes >= targetMinutes,
      completionPercent: percent,
      records: dayRecords,
    }
  })
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}
