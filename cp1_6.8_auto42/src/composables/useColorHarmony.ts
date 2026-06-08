import type { HarmonyRule, ColorItem } from '@/types'
import { hslToHex, generateId } from '@/utils/colorUtils'

export function useColorHarmony() {
  function applyHarmonyRule(
    baseColor: ColorItem,
    rule: HarmonyRule,
    count: number = 5
  ): ColorItem[] {
    const baseHsl = baseColor.hsl
    const colors: ColorItem[] = []

    switch (rule) {
      case 'monochromatic':
        colors.push(...generateMonochromatic(baseHsl, count))
        break
      case 'complementary':
        colors.push(...generateComplementary(baseHsl, count))
        break
      case 'split-complementary':
        colors.push(...generateSplitComplementary(baseHsl, count))
        break
      case 'triadic':
        colors.push(...generateTriadic(baseHsl, count))
        break
      case 'tetradic':
        colors.push(...generateTetradic(baseHsl, count))
        break
    }

    return colors.slice(0, count)
  }

  function generateMonochromatic(
    baseHsl: { h: number; s: number; l: number },
    count: number
  ): ColorItem[] {
    const colors: ColorItem[] = []
    const lStep = 60 / (count - 1 || 1)
    const startL = Math.max(20, baseHsl.l - 30)

    for (let i = 0; i < count; i++) {
      const l = Math.min(90, startL + lStep * i)
      const hex = hslToHex(baseHsl.h, baseHsl.s, l)
      colors.push({
        id: generateId(),
        hex,
        name: `颜色 ${i + 1}`,
        locked: false,
        hsl: { h: baseHsl.h, s: baseHsl.s, l: Math.round(l) }
      })
    }

    return colors.sort((a, b) => b.hsl.l - a.hsl.l)
  }

  function generateComplementary(
    baseHsl: { h: number; s: number; l: number },
    count: number
  ): ColorItem[] {
    const colors: ColorItem[] = []
    const complementH = (baseHsl.h + 180) % 360

    const lValues = [85, 65, 45, 65, 35]
    const sValues = [baseHsl.s, baseHsl.s, baseHsl.s, baseHsl.s * 0.8, baseHsl.s]
    const hueValues = [baseHsl.h, baseHsl.h, baseHsl.h, complementH, complementH]

    for (let i = 0; i < count; i++) {
      const h = hueValues[i % hueValues.length]
      const s = Math.min(100, Math.max(10, sValues[i % sValues.length]))
      const l = lValues[i % lValues.length]
      const hex = hslToHex(h, s, l)
      colors.push({
        id: generateId(),
        hex,
        name: `颜色 ${i + 1}`,
        locked: false,
        hsl: { h: Math.round(h), s: Math.round(s), l: Math.round(l) }
      })
    }

    return colors.sort((a, b) => b.hsl.l - a.hsl.l)
  }

  function generateSplitComplementary(
    baseHsl: { h: number; s: number; l: number },
    count: number
  ): ColorItem[] {
    const colors: ColorItem[] = []
    const split1H = (baseHsl.h + 150) % 360
    const split2H = (baseHsl.h + 210) % 360

    const palette = [
      { h: baseHsl.h, s: baseHsl.s, l: 80 },
      { h: baseHsl.h, s: baseHsl.s, l: 50 },
      { h: split1H, s: baseHsl.s * 0.9, l: 60 },
      { h: split2H, s: baseHsl.s * 0.9, l: 55 },
      { h: split1H, s: baseHsl.s * 0.7, l: 35 }
    ]

    for (let i = 0; i < Math.min(count, palette.length); i++) {
      const c = palette[i]
      const hex = hslToHex(c.h, c.s, c.l)
      colors.push({
        id: generateId(),
        hex,
        name: `颜色 ${i + 1}`,
        locked: false,
        hsl: { h: Math.round(c.h), s: Math.round(c.s), l: Math.round(c.l) }
      })
    }

    return colors.sort((a, b) => b.hsl.l - a.hsl.l)
  }

  function generateTriadic(
    baseHsl: { h: number; s: number; l: number },
    count: number
  ): ColorItem[] {
    const colors: ColorItem[] = []
    const h1 = baseHsl.h
    const h2 = (baseHsl.h + 120) % 360
    const h3 = (baseHsl.h + 240) % 360

    const palette = [
      { h: h1, s: baseHsl.s, l: 80 },
      { h: h2, s: baseHsl.s, l: 65 },
      { h: h3, s: baseHsl.s, l: 55 },
      { h: h1, s: baseHsl.s * 0.8, l: 45 },
      { h: h2, s: baseHsl.s * 0.7, l: 35 }
    ]

    for (let i = 0; i < Math.min(count, palette.length); i++) {
      const c = palette[i]
      const hex = hslToHex(c.h, c.s, c.l)
      colors.push({
        id: generateId(),
        hex,
        name: `颜色 ${i + 1}`,
        locked: false,
        hsl: { h: Math.round(c.h), s: Math.round(c.s), l: Math.round(c.l) }
      })
    }

    return colors.sort((a, b) => b.hsl.l - a.hsl.l)
  }

  function generateTetradic(
    baseHsl: { h: number; s: number; l: number },
    count: number
  ): ColorItem[] {
    const colors: ColorItem[] = []
    const h1 = baseHsl.h
    const h2 = (baseHsl.h + 90) % 360
    const h3 = (baseHsl.h + 180) % 360
    const h4 = (baseHsl.h + 270) % 360

    const palette = [
      { h: h1, s: baseHsl.s, l: 75 },
      { h: h2, s: baseHsl.s, l: 65 },
      { h: h3, s: baseHsl.s, l: 55 },
      { h: h4, s: baseHsl.s, l: 45 },
      { h: h1, s: baseHsl.s * 0.6, l: 35 }
    ]

    for (let i = 0; i < Math.min(count, palette.length); i++) {
      const c = palette[i]
      const hex = hslToHex(c.h, c.s, c.l)
      colors.push({
        id: generateId(),
        hex,
        name: `颜色 ${i + 1}`,
        locked: false,
        hsl: { h: Math.round(c.h), s: Math.round(c.s), l: Math.round(c.l) }
      })
    }

    return colors.sort((a, b) => b.hsl.l - a.hsl.l)
  }

  function adjustHarmony(
    colors: ColorItem[],
    changedIndex: number
  ): ColorItem[] {
    const result = colors.map(c => ({ ...c, hsl: { ...c.hsl } }))
    const changed = result[changedIndex]

    if (changed.locked) return result

    const baseHue = changed.hsl.h
    const hueDiffs = result.map((c, i) => {
      if (i === changedIndex) return 0
      let diff = c.hsl.h - baseHue
      if (diff > 180) diff -= 360
      if (diff < -180) diff += 360
      return diff
    })

    for (let i = 0; i < result.length; i++) {
      if (i === changedIndex || result[i].locked) continue

      let newHue = baseHue + hueDiffs[i]
      if (newHue < 0) newHue += 360
      if (newHue >= 360) newHue -= 360

      result[i].hsl.h = Math.round(newHue)
      result[i].hex = hslToHex(result[i].hsl.h, result[i].hsl.s, result[i].hsl.l)
    }

    return result
  }

  return {
    applyHarmonyRule,
    adjustHarmony
  }
}
