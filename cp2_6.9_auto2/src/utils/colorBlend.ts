export interface RGB {
  r: number
  g: number
  b: number
  a?: number
}

export type BlendMode = 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion'

const clamp = (v: number) => Math.max(0, Math.min(255, v))

export const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 }
}

export const rgbToHex = ({ r, g, b }: RGB): string => {
  return '#' + [r, g, b].map(x => clamp(Math.round(x)).toString(16).padStart(2, '0')).join('')
}

export const blendColors = (base: RGB, blend: RGB, mode: BlendMode, opacity: number = 1): RGB => {
  const bR = base.r / 255
  const bG = base.g / 255
  const bB = base.b / 255
  const sR = blend.r / 255
  const sG = blend.g / 255
  const sB = blend.b / 255

  let r: number, g: number, b: number

  switch (mode) {
    case 'multiply':
      r = sR * bR; g = sG * bG; b = sB * bB
      break
    case 'screen':
      r = 1 - (1 - sR) * (1 - bR)
      g = 1 - (1 - sG) * (1 - bG)
      b = 1 - (1 - sB) * (1 - bB)
      break
    case 'overlay':
      r = bR > 0.5 ? 1 - 2 * (1 - sR) * (1 - bR) : 2 * sR * bR
      g = bG > 0.5 ? 1 - 2 * (1 - sG) * (1 - bG) : 2 * sG * bG
      b = bB > 0.5 ? 1 - 2 * (1 - sB) * (1 - bB) : 2 * sB * bB
      break
    case 'darken':
      r = Math.min(sR, bR); g = Math.min(sG, bG); b = Math.min(sB, bB)
      break
    case 'lighten':
      r = Math.max(sR, bR); g = Math.max(sG, bG); b = Math.max(sB, bB)
      break
    case 'color-dodge':
      r = bR === 1 ? 1 : Math.min(1, sR / (1 - bR))
      g = bG === 1 ? 1 : Math.min(1, sG / (1 - bG))
      b = bB === 1 ? 1 : Math.min(1, sB / (1 - bB))
      break
    case 'color-burn':
      r = bR === 0 ? 0 : Math.min(1, (1 - (1 - sR) / bR))
      g = bG === 0 ? 0 : Math.min(1, (1 - (1 - sG) / bG))
      b = bB === 0 ? 0 : Math.min(1, (1 - (1 - sB) / bB))
      break
    case 'hard-light':
      r = sR > 0.5 ? 1 - 2 * (1 - sR) * (1 - bR) : 2 * sR * bR
      g = sG > 0.5 ? 1 - 2 * (1 - sG) * (1 - bG) : 2 * sG * bG
      b = sB > 0.5 ? 1 - 2 * (1 - sB) * (1 - bB) : 2 * sB * bB
      break
    case 'soft-light':
      const softLight = (s: number, d: number) =>
        s <= 0.5 ? d - (1 - 2 * s) * d * (1 - d) : d + (2 * s - 1) * (Math.sqrt(d) - d)
      r = softLight(sR, bR); g = softLight(sG, bG); b = softLight(sB, bB)
      break
    case 'difference':
      r = Math.abs(sR - bR); g = Math.abs(sG - bG); b = Math.abs(sB - bB)
      break
    case 'exclusion':
      r = sR + bR - 2 * sR * bR
      g = sG + bG - 2 * sG * bG
      b = sB + bB - 2 * sB * bB
      break
    default:
      r = sR; g = sG; b = sB
  }

  return {
    r: clamp((r * opacity + bR * (1 - opacity)) * 255),
    g: clamp((g * opacity + bG * (1 - opacity)) * 255),
    b: clamp((b * opacity + bB * (1 - opacity)) * 255),
  }
}
