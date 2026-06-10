import type { TeaEntry } from '../types/tea'

const STORAGE_KEY = 'yi_pao_lu_entries'

let saveTimeoutId: ReturnType<typeof setTimeout> | null = null

export function loadEntries(): Promise<TeaEntry[]> {
  return new Promise((resolve) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        resolve([])
        return
      }
      const parsed = JSON.parse(raw) as TeaEntry[]
      resolve(Array.isArray(parsed) ? parsed : [])
    } catch {
      resolve([])
    }
  })
}

export function saveEntries(entries: TeaEntry[]): Promise<void> {
  return new Promise((resolve) => {
    if (saveTimeoutId !== null) {
      clearTimeout(saveTimeoutId)
    }
    saveTimeoutId = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
      } catch {
        // ignore storage errors
      }
      saveTimeoutId = null
      resolve()
    }, 30)
  })
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}
