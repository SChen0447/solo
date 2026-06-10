import { v4 as uuidv4 } from 'uuid'
import type { Itinerary, DayPlan, Spot } from './types'
import { generateCoordinates, getRandomLandmark } from './mapRenderer'

export const DEFAULT_CITIES = ['北京', '上海', '成都', '杭州', '西安']

export interface DragState {
  isDragging: boolean
  draggedSpotId: string | null
  sourceDayId: string | null
  targetDayId: string | null
  targetIndex: number
  dropIndicatorDayId: string | null
  dropIndicatorIndex: number
}

export function createInitialItinerary(): Itinerary {
  const today = new Date()
  const days: Itinerary = []

  for (let i = 0; i < 3; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

    const spots: Spot[] = []
    const numSpots = 2 + Math.floor(Math.random() * 2)
    for (let j = 0; j < numSpots; j++) {
      const landmark = getRandomLandmark(DEFAULT_CITIES[i % DEFAULT_CITIES.length])
      const coords = generateCoordinates(i * 4 + j, 12)
      spots.push({
        id: uuidv4(),
        name: landmark.name,
        duration: 30 + Math.floor(Math.random() * 8) * 15,
        rating: 3 + Math.floor(Math.random() * 3),
        lat: coords.lat,
        lng: coords.lng
      })
    }

    days.push({
      id: uuidv4(),
      date: dateStr,
      spots
    })
  }

  return days
}

export function addDay(itinerary: Itinerary): Itinerary {
  const lastDate = itinerary.length > 0
    ? new Date(itinerary[itinerary.length - 1].date)
    : new Date()
  lastDate.setDate(lastDate.getDate() + 1)
  const dateStr = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`

  const newDay: DayPlan = {
    id: uuidv4(),
    date: dateStr,
    spots: []
  }

  return [...itinerary, newDay]
}

export function addSpot(
  itinerary: Itinerary,
  dayId: string,
  spotData: Partial<Spot> & { name: string; duration: number; rating: number }
): Itinerary {
  const coords = generateCoordinates(Math.random() * 100, 100)

  const newSpot: Spot = {
    id: uuidv4(),
    name: spotData.name,
    duration: spotData.duration,
    rating: spotData.rating,
    lat: spotData.lat ?? coords.lat,
    lng: spotData.lng ?? coords.lng
  }

  return itinerary.map(day =>
    day.id === dayId
      ? { ...day, spots: [...day.spots, newSpot] }
      : day
  )
}

export function removeSpot(
  itinerary: Itinerary,
  dayId: string,
  spotId: string
): Itinerary {
  return itinerary.map(day =>
    day.id === dayId
      ? { ...day, spots: day.spots.filter(s => s.id !== spotId) }
      : day
  )
}

export function updateSpot(
  itinerary: Itinerary,
  dayId: string,
  spotId: string,
  updates: Partial<Spot>
): Itinerary {
  return itinerary.map(day =>
    day.id === dayId
      ? {
          ...day,
          spots: day.spots.map(s =>
            s.id === spotId ? { ...s, ...updates } : s
          )
        }
      : day
  )
}

export function moveSpot(
  itinerary: Itinerary,
  sourceDayId: string,
  spotId: string,
  targetDayId: string,
  targetIndex: number
): Itinerary {
  let movedSpot: Spot | null = null

  const afterRemove = itinerary.map(day => {
    if (day.id === sourceDayId) {
      const spot = day.spots.find(s => s.id === spotId)
      if (spot) movedSpot = spot
      return { ...day, spots: day.spots.filter(s => s.id !== spotId) }
    }
    return day
  })

  if (!movedSpot) return itinerary

  return afterRemove.map(day => {
    if (day.id === targetDayId) {
      const newSpots = [...day.spots]
      const insertIndex = Math.min(targetIndex, newSpots.length)
      newSpots.splice(insertIndex, 0, movedSpot!)
      return { ...day, spots: newSpots }
    }
    return day
  })
}

export function removeDay(itinerary: Itinerary, dayId: string): Itinerary {
  return itinerary.filter(d => d.id !== dayId)
}

export function reorderSpotsInDay(
  itinerary: Itinerary,
  dayId: string,
  fromIndex: number,
  toIndex: number
): Itinerary {
  return itinerary.map(day => {
    if (day.id !== dayId) return day
    const newSpots = [...day.spots]
    const [moved] = newSpots.splice(fromIndex, 1)
    const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex
    newSpots.splice(insertAt, 0, moved)
    return { ...day, spots: newSpots }
  })
}

export function findSpotById(
  itinerary: Itinerary,
  spotId: string
): { day: DayPlan; spot: Spot; index: number } | null {
  for (const day of itinerary) {
    const index = day.spots.findIndex(s => s.id === spotId)
    if (index !== -1) {
      return { day, spot: day.spots[index], index }
    }
  }
  return null
}

export function getTotalDuration(itinerary: Itinerary): number {
  let total = 0
  for (const day of itinerary) {
    for (const spot of day.spots) {
      total += spot.duration
    }
  }
  return total
}

export function getTotalSpots(itinerary: Itinerary): number {
  return itinerary.reduce((acc, day) => acc + day.spots.length, 0)
}

export function getSpotsPerDay(itinerary: Itinerary): number[] {
  return itinerary.map(day => day.spots.length)
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}分钟`
  if (mins === 0) return `${hours}小时`
  return `${hours}小时${mins}分钟`
}

export function exportToJson(itinerary: Itinerary): string {
  const data = {
    exportedAt: new Date().toISOString(),
    totalDays: itinerary.length,
    totalSpots: getTotalSpots(itinerary),
    totalDuration: formatDuration(getTotalDuration(itinerary)),
    itinerary
  }
  return JSON.stringify(data, null, 2)
}

export function downloadJson(content: string, filename: string = 'travel-itinerary.json'): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
