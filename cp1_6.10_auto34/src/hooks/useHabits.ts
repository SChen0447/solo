import { useState, useEffect, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Habit, CheckInRecord, HabitStats, Frequency } from '@/types'
import { loadHabits, saveHabits, loadRecords, saveRecords, checkStorageLimit } from '@/utils/storage'
import { formatDate, formatTime, calculateStreak } from '@/utils/date'
import { playCheckInSound } from '@/utils/sound'

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [records, setRecords] = useState<CheckInRecord[]>([])
  const [storageWarning, setStorageWarning] = useState(false)

  useEffect(() => {
    setHabits(loadHabits())
    setRecords(loadRecords())
    setStorageWarning(checkStorageLimit())
  }, [])

  useEffect(() => {
    saveHabits(habits)
    setStorageWarning(checkStorageLimit())
  }, [habits])

  useEffect(() => {
    saveRecords(records)
    setStorageWarning(checkStorageLimit())
  }, [records])

  const addHabit = useCallback((data: {
    name: string
    icon: string
    frequency: Frequency
    customDays?: number
    targetMinutes: number
    reminderTime?: string
  }) => {
    const newHabit: Habit = {
      id: uuidv4(),
      name: data.name,
      icon: data.icon,
      frequency: data.frequency,
      customDays: data.customDays,
      targetMinutes: data.targetMinutes,
      reminderTime: data.reminderTime,
      createdAt: new Date().toISOString(),
    }
    setHabits((prev) => [...prev, newHabit])
    return newHabit
  }, [])

  const updateHabit = useCallback((id: string, data: Partial<Habit>) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...data } : h))
    )
  }, [])

  const deleteHabit = useCallback((id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id))
    setRecords((prev) => prev.filter((r) => r.habitId !== id))
  }, [])

  const checkIn = useCallback((habitId: string, minutes?: number, note?: string) => {
    const habit = habits.find((h) => h.id === habitId)
    if (!habit) return

    const today = formatDate(new Date())
    const todayRecords = records.filter(
      (r) => r.habitId === habitId && r.date === today
    )
    const completedSoFar = todayRecords.reduce((sum, r) => sum + r.completedMinutes, 0)
    const remaining = Math.max(0, habit.targetMinutes - completedSoFar)
    const minutesToAdd = minutes ?? remaining

    if (minutesToAdd <= 0) return

    const newRecord: CheckInRecord = {
      habitId,
      date: today,
      completedMinutes: minutesToAdd,
      checkInTime: formatTime(new Date()),
      note,
    }
    setRecords((prev) => [...prev, newRecord])
    playCheckInSound()
  }, [habits, records])

  const cancelCheckIn = useCallback((habitId: string) => {
    const today = formatDate(new Date())
    setRecords((prev) =>
      prev.filter((r) => !(r.habitId === habitId && r.date === today))
    )
  }, [])

  const getTodayProgress = useCallback((habitId: string): number => {
    const habit = habits.find((h) => h.id === habitId)
    if (!habit || habit.targetMinutes <= 0) return 0
    const today = formatDate(new Date())
    const todayRecords = records.filter(
      (r) => r.habitId === habitId && r.date === today
    )
    const completed = todayRecords.reduce((sum, r) => sum + r.completedMinutes, 0)
    return Math.min(100, (completed / habit.targetMinutes) * 100)
  }, [habits, records])

  const getTodayMinutes = useCallback((habitId: string): number => {
    const today = formatDate(new Date())
    return records
      .filter((r) => r.habitId === habitId && r.date === today)
      .reduce((sum, r) => sum + r.completedMinutes, 0)
  }, [records])

  const getHabitStats = useCallback((habitId: string): HabitStats => {
    const habitRecords = records.filter((r) => r.habitId === habitId && r.completedMinutes > 0)
    const uniqueDays = new Set(habitRecords.map((r) => r.date))
    const currentStreak = calculateStreak(habitId, records)

    let longestStreak = 0
    let tempStreak = 0
    const sortedDates = Array.from(uniqueDays).sort()

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1
      } else {
        const prev = new Date(sortedDates[i - 1])
        const curr = new Date(sortedDates[i])
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
        if (diff === 1) {
          tempStreak++
        } else {
          tempStreak = 1
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak)
    }

    const habit = habits.find((h) => h.id === habitId)
    const totalDays = habit
      ? Math.max(1, Math.ceil((Date.now() - new Date(habit.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
      : 1
    const completionRate = uniqueDays.size / totalDays

    return {
      habitId,
      currentStreak,
      longestStreak,
      totalDays: uniqueDays.size,
      completionRate,
    }
  }, [habits, records])

  const allStats = useMemo(() => {
    return habits.map((h) => getHabitStats(h.id))
  }, [habits, getHabitStats])

  return {
    habits,
    records,
    storageWarning,
    addHabit,
    updateHabit,
    deleteHabit,
    checkIn,
    cancelCheckIn,
    getTodayProgress,
    getTodayMinutes,
    getHabitStats,
    allStats,
  }
}
