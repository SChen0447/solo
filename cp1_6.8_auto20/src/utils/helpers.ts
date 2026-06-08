import type { PrototypeElement, Keyframe, ExportData } from '@/types'

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
}

export const snapToGrid = (value: number, gridSize: number = 20): number => {
  return Math.round(value / gridSize) * gridSize
}

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max)
}

export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj))
}

export const generateShortHash = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  }
}

export const compressKeyframes = (keyframes: Keyframe[], maxFrames: number = 200): Keyframe[] => {
  if (keyframes.length <= maxFrames) return keyframes

  const step = Math.ceil(keyframes.length / maxFrames)
  const compressed: Keyframe[] = []

  for (let i = 0; i < keyframes.length; i += step) {
    compressed.push(keyframes[i])
  }

  if (compressed[compressed.length - 1].id !== keyframes[keyframes.length - 1].id) {
    compressed.push(keyframes[keyframes.length - 1])
  }

  return compressed
}

export const serializeExport = (data: ExportData): string => {
  return JSON.stringify(data, null, 2)
}

export const parseImport = (json: string): ExportData | null => {
  try {
    const data = JSON.parse(json) as ExportData
    if (!data.version || !data.elements) return null
    return data
  } catch {
    return null
  }
}

export const getElementDefaults = (type: string): Partial<PrototypeElement> => {
  const defaults: Record<string, Partial<PrototypeElement>> = {
    button: {
      label: '按钮',
      style: { x: 100, y: 100, width: 120, height: 40, rotation: 0, opacity: 100 }
    },
    card: {
      label: '卡片',
      style: { x: 100, y: 100, width: 200, height: 150, rotation: 0, opacity: 100 }
    },
    modal: {
      label: '弹窗',
      style: { x: 100, y: 100, width: 300, height: 200, rotation: 0, opacity: 100 }
    },
    slider: {
      label: '滑动条',
      style: { x: 100, y: 100, width: 200, height: 30, rotation: 0, opacity: 100 }
    }
  }
  return defaults[type] || {}
}
