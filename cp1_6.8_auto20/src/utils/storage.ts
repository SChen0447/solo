import type { ExportData } from '@/types'
import { generateShortHash, parseImport, serializeExport } from './helpers'

const STORAGE_PREFIX = 'prototype_animator_'
const SHARE_PREFIX = 'share_'

export const saveToLocal = (key: string, data: unknown): void => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data))
  } catch (e) {
    console.error('保存到本地存储失败:', e)
  }
}

export const loadFromLocal = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key)
    return item ? (JSON.parse(item) as T) : defaultValue
  } catch {
    return defaultValue
  }
}

export const removeFromLocal = (key: string): void => {
  localStorage.removeItem(STORAGE_PREFIX + key)
}

export const createShareLink = (data: ExportData): string => {
  const hash = generateShortHash()
  const encoded = btoa(unescape(encodeURIComponent(serializeExport(data))))
  saveToLocal(SHARE_PREFIX + hash, encoded)
  
  const baseUrl = window.location.origin + window.location.pathname
  return `${baseUrl}?share=${hash}`
}

export const loadShareData = async (hash: string): Promise<ExportData | null> => {
  const stored = loadFromLocal<string | null>(SHARE_PREFIX + hash, null)
  if (stored) {
    return parseImport(decodeURIComponent(escape(atob(stored))))
  }
  return null
}

export const exportToJSON = (data: ExportData, filename: string = 'prototype.json'): void => {
  const jsonStr = serializeExport(data)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
