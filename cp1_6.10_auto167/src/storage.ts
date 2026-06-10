export interface Star {
  x: number
  y: number
  size: number
  baseAlpha: number
}

export interface Line {
  star1Index: number
  star2Index: number
  opacity: number
  fadeIn: boolean
}

export interface ConstellationRecord {
  id: string
  stars: Star[]
  lines: Line[]
  text: string
  thumbnail: string
  timestamp: number
}

const STORAGE_KEY = 'constellation_history'

export function loadHistory(): ConstellationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

export function saveHistory(records: ConstellationRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    console.warn('Failed to save to localStorage')
  }
}

export function addRecord(record: ConstellationRecord): ConstellationRecord[] {
  const history = loadHistory()
  history.unshift(record)
  saveHistory(history)
  return history
}

export function removeRecord(id: string): ConstellationRecord[] {
  const history = loadHistory()
  const filtered = history.filter((r) => r.id !== id)
  saveHistory(filtered)
  return filtered
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
