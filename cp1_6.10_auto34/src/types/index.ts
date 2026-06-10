export type Frequency = 'daily' | 'weekly' | 'custom'

export interface Habit {
  id: string
  name: string
  icon: string
  frequency: Frequency
  customDays?: number
  targetMinutes: number
  reminderTime?: string
  createdAt: string
}

export interface CheckInRecord {
  habitId: string
  date: string
  completedMinutes: number
  checkInTime: string
  note?: string
}

export interface HabitStats {
  habitId: string
  currentStreak: number
  longestStreak: number
  totalDays: number
  completionRate: number
}

export interface DayCellData {
  date: string
  completed: boolean
  completionPercent: number
  records: CheckInRecord[]
}
