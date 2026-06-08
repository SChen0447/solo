import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ColorItem, Palette, HarmonyRule } from '@/types'
import { hslToHex, generateId, getContrastRatio } from '@/utils/colorUtils'
import { useColorExtractor } from '@/composables/useColorExtractor'
import { useColorHarmony } from '@/composables/useColorHarmony'

const STORAGE_KEY = 'smart-color-palettes'

export const usePaletteStore = defineStore('palette', () => {
  const colors = ref<ColorItem[]>(getDefaultColors())
  const currentRule = ref<HarmonyRule>('monochromatic')
  const isDarkTheme = ref(false)
  const savedPalettes = ref<Palette[]>(loadSavedPalettes())
  const isExtracting = ref(false)
  const extractionProgress = ref(0)
  const uploadedImage = ref<string | null>(null)

  const { extractColors } = useColorExtractor()
  const { applyHarmonyRule, adjustHarmony } = useColorHarmony()

  const sortedColors = computed(() => {
    return [...colors.value].sort((a, b) => {
      const lumA = getLuminance(a.hex)
      const lumB = getLuminance(b.hex)
      return lumB - lumA
    })
  })

  const textColor = computed(() => {
    const bgColor = isDarkTheme.value ? sortedColors.value[4]?.hex : sortedColors.value[0]?.hex
    const textColorHex = '#FFFFFF'
    if (!bgColor) return '#333333'
    
    const contrastLight = getContrastRatio(bgColor, '#FFFFFF')
    const contrastDark = getContrastRatio(bgColor, '#333333')
    
    return contrastLight >= contrastDark ? '#FFFFFF' : '#333333'
  })

  function getLuminance(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return 0.299 * r + 0.587 * g + 0.114 * b
  }

  function getDefaultColors(): ColorItem[] {
    const defaultHexes = ['#4A90D9', '#5BA3E8', '#7FB8F0', '#A8CCF5', '#D4E6FA']
    return defaultHexes.map((hex, i) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      const max = Math.max(r, g, b) / 255
      const min = Math.min(r, g, b) / 255
      let h = 0, s = 0
      const l = (max + min) / 2

      if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        if (max === r / 255) h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0)) / 6
        else if (max === g / 255) h = ((b / 255 - r / 255) / d + 2) / 6
        else h = ((r / 255 - g / 255) / d + 4) / 6
      }

      return {
        id: generateId(),
        hex,
        name: `颜色 ${i + 1}`,
        locked: false,
        hsl: { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
      }
    })
  }

  function loadSavedPalettes(): Palette[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPalettes.value))
    } catch (e) {
      console.error('保存失败', e)
    }
  }

  async function extractColorsFromImage(file: File) {
    isExtracting.value = true
    extractionProgress.value = 0

    try {
      const extracted = await extractColors(file)
      colors.value = extracted
      uploadedImage.value = URL.createObjectURL(file)
      currentRule.value = 'monochromatic'
    } finally {
      isExtracting.value = false
    }
  }

  function updateColor(index: number, hsl: { h?: number; s?: number; l?: number }) {
    if (index < 0 || index >= colors.value.length) return
    if (colors.value[index].locked) return

    const color = colors.value[index]
    const newHsl = {
      h: hsl.h !== undefined ? hsl.h : color.hsl.h,
      s: hsl.s !== undefined ? hsl.s : color.hsl.s,
      l: hsl.l !== undefined ? hsl.l : color.hsl.l
    }

    color.hsl = newHsl
    color.hex = hslToHex(newHsl.h, newHsl.s, newHsl.l)

    const adjusted = adjustHarmony(colors.value, index)
    for (let i = 0; i < adjusted.length; i++) {
      if (i !== index && !colors.value[i].locked) {
        colors.value[i].hsl = adjusted[i].hsl
        colors.value[i].hex = adjusted[i].hex
      }
    }
  }

  function updateColorName(index: number, name: string) {
    if (index >= 0 && index < colors.value.length) {
      colors.value[index].name = name
    }
  }

  function toggleLock(index: number) {
    if (index >= 0 && index < colors.value.length) {
      colors.value[index].locked = !colors.value[index].locked
    }
  }

  function applyRule(rule: HarmonyRule) {
    currentRule.value = rule

    const unlockedIndex = colors.value.findIndex(c => !c.locked)
    if (unlockedIndex === -1) return

    const baseColor = colors.value[unlockedIndex]
    const newColors = applyHarmonyRule(baseColor, rule, 5)

    const lockedColors = colors.value.filter(c => c.locked)
    const result: ColorItem[] = []

    for (let i = 0; i < 5; i++) {
      if (colors.value[i]?.locked) {
        result.push({ ...colors.value[i] })
      } else {
        const newColor = newColors.shift()
        if (newColor) {
          result.push(newColor)
        }
      }
    }

    while (result.length < 5 && newColors.length > 0) {
      result.push(newColors.shift()!)
    }

    colors.value = result.slice(0, 5)
  }

  function savePalette(name: string, tags: string[]) {
    const palette: Palette = {
      id: generateId(),
      name,
      colors: colors.value.map(c => ({ ...c, hsl: { ...c.hsl } })),
      tags,
      createdAt: Date.now()
    }
    savedPalettes.value.unshift(palette)
    saveToStorage()
    return palette
  }

  function loadPalette(id: string) {
    const palette = savedPalettes.value.find(p => p.id === id)
    if (palette) {
      colors.value = palette.colors.map(c => ({ ...c, hsl: { ...c.hsl } }))
    }
  }

  function deletePalette(id: string) {
    const index = savedPalettes.value.findIndex(p => p.id === id)
    if (index > -1) {
      savedPalettes.value.splice(index, 1)
      saveToStorage()
    }
  }

  function reorderPalettes(fromIndex: number, toIndex: number) {
    const [removed] = savedPalettes.value.splice(fromIndex, 1)
    savedPalettes.value.splice(toIndex, 0, removed)
    saveToStorage()
  }

  function exportPalette(): string {
    const data = {
      name: '我的配色方案',
      colors: colors.value.map(c => ({
        name: c.name,
        hex: c.hex,
        hsl: c.hsl
      })),
      exportedAt: new Date().toISOString()
    }
    return JSON.stringify(data, null, 2)
  }

  function downloadExport() {
    const json = exportPalette()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'color-palette.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function toggleTheme() {
    isDarkTheme.value = !isDarkTheme.value
  }

  return {
    colors,
    sortedColors,
    currentRule,
    isDarkTheme,
    savedPalettes,
    isExtracting,
    extractionProgress,
    uploadedImage,
    textColor,
    extractColorsFromImage,
    updateColor,
    updateColorName,
    toggleLock,
    applyRule,
    savePalette,
    loadPalette,
    deletePalette,
    reorderPalettes,
    exportPalette,
    downloadExport,
    toggleTheme
  }
})
