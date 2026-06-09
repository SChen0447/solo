import type { MindMapData } from '../types'

const STORAGE_KEY = 'collaborative_mindmap_data'

export function saveToStorage(data: MindMapData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
  }
}

export function loadFromStorage(): MindMapData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as MindMapData
  } catch (e) {
    console.error('Failed to load from localStorage:', e)
    return null
  }
}

export function exportToJSON(data: MindMapData): string {
  return JSON.stringify(data, null, 2)
}

export function downloadJSON(data: MindMapData, filename: string = 'mindmap.json'): void {
  const json = exportToJSON(data)
  const blob = new Blob([json], { type: 'application/json' })
  triggerDownload(blob, filename)
}

export async function exportToPNG(canvas: HTMLCanvasElement, filename: string = 'mindmap.png'): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          triggerDownload(blob, filename)
          resolve()
        } else {
          reject(new Error('Failed to create blob from canvas'))
        }
      }, 'image/png')
    } catch (e) {
      reject(e)
    }
  })
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}
