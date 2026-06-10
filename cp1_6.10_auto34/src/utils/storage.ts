import type { Habit, CheckInRecord } from '@/types'

const HABITS_KEY = 'habit_tracker_habits'
const RECORDS_KEY = 'habit_tracker_records'
const MAX_SIZE = 5 * 1024 * 1024

export function getStorageSize(): number {
  let total = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const value = localStorage.getItem(key) || ''
      total += key.length + value.length
    }
  }
  return total
}

export function checkStorageLimit(): boolean {
  return getStorageSize() >= MAX_SIZE
}

export function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(HABITS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveHabits(habits: Habit[]): void {
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits))
}

export function loadRecords(): CheckInRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveRecords(records: CheckInRecord[]): void {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
}

export function clearAllData(): void {
  localStorage.removeItem(HABITS_KEY)
  localStorage.removeItem(RECORDS_KEY)
}
