import type { SignItem, DrawRecord } from '../types'

const SIGNS_KEY = 'sign_wall_signs'
const DRAWS_KEY = 'sign_wall_draws'
const MAX_SIGNS = 60

export function loadSigns(): SignItem[] {
  try {
    const data = localStorage.getItem(SIGNS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveSigns(signs: SignItem[]): void {
  const trimmed = signs.slice(-MAX_SIGNS)
  try {
    localStorage.setItem(SIGNS_KEY, JSON.stringify(trimmed))
  } catch {
    const compressed = trimmed.map(s => ({ ...s, image: s.image.slice(0, 100000) }))
    localStorage.setItem(SIGNS_KEY, JSON.stringify(compressed))
  }
}

export function loadDraws(): DrawRecord[] {
  try {
    const data = localStorage.getItem(DRAWS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveDraws(draws: DrawRecord[]): void {
  try {
    localStorage.setItem(DRAWS_KEY, JSON.stringify(draws.slice(-100)))
  } catch {
    // ignore
  }
}
