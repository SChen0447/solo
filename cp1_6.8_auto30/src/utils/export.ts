export interface PatternConfig {
  id: number
  type: string
  x: number
  y: number
  rotation: number
  scale: number
  opacity: number
  colorIndex: number
}

export function exportSVG(patterns: PatternConfig[], canvasWidth: number, canvasHeight: number, colors: string[]): string {
  const patternElements = patterns.map(p => generatePatternSVG(p, colors[p.colorIndex % colors.length])).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <rect width="100%" height="100%" fill="#1a1a2e"/>
  <g id="patterns">
${patternElements}
  </g>
</svg>`
}

function generatePatternSVG(pattern: PatternConfig, color: string): string {
  const size = 60 * pattern.scale
  const cx = pattern.x
  const cy = pattern.y
  const opacity = pattern.opacity
  const rotation = pattern.rotation

  const transform = `translate(${cx}, ${cy}) rotate(${rotation}) scale(${pattern.scale})`

  let shape = ''
  switch (pattern.type) {
    case 'circle':
      shape = `<circle cx="0" cy="0" r="30" fill="${color}" opacity="${opacity}"/>`
      break
    case 'square':
      shape = `<rect x="-30" y="-30" width="60" height="60" fill="${color}" opacity="${opacity}"/>`
      break
    case 'triangle':
      shape = `<polygon points="0,-35 30,25 -30,25" fill="${color}" opacity="${opacity}"/>`
      break
    case 'hexagon':
      const hexPoints = []
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2
        hexPoints.push(`${30 * Math.cos(angle)},${30 * Math.sin(angle)}`)
      }
      shape = `<polygon points="${hexPoints.join(' ')}" fill="${color}" opacity="${opacity}"/>`
      break
    case 'star':
      const starPoints = []
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2
        const r = i % 2 === 0 ? 35 : 15
        starPoints.push(`${r * Math.cos(angle)},${r * Math.sin(angle)}`)
      }
      shape = `<polygon points="${starPoints.join(' ')}" fill="${color}" opacity="${opacity}"/>`
      break
    case 'spiral':
      let spiralPath = 'M 0 0 '
      for (let i = 0; i <= 720; i += 10) {
        const angle = (i * Math.PI) / 180
        const r = (i / 720) * 30
        spiralPath += `L ${r * Math.cos(angle)} ${r * Math.sin(angle)} `
      }
      shape = `<path d="${spiralPath}" stroke="${color}" stroke-width="3" fill="none" opacity="${opacity}"/>`
      break
    case 'wave':
      let wavePath = 'M -35 0 '
      for (let i = -35; i <= 35; i += 2) {
        const y = Math.sin((i / 35) * Math.PI * 2) * 12
        wavePath += `L ${i} ${y} `
      }
      shape = `<path d="${wavePath}" stroke="${color}" stroke-width="4" fill="none" opacity="${opacity}" stroke-linecap="round"/>`
      break
    case 'dots':
      let dots = ''
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          const dx = -24 + col * 12
          const dy = -24 + row * 12
          dots += `<circle cx="${dx}" cy="${dy}" r="4" fill="${color}" opacity="${opacity}"/>`
        }
      }
      shape = dots
      break
    default:
      shape = `<circle cx="0" cy="0" r="30" fill="${color}" opacity="${opacity}"/>`
  }

  return `    <g transform="translate(${cx}, ${cy}) rotate(${rotation})">${shape}</g>`
}

export function downloadSVG(svgContent: string, filename: string = 'geometry-gallery.svg'): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function generateShareURL(patterns: PatternConfig[], themeIndex: number): string {
  const config = {
    t: themeIndex,
    p: patterns.map(p => ({
      i: p.id,
      ty: p.type,
      x: Math.round(p.x),
      y: Math.round(p.y),
      r: Math.round(p.rotation),
      s: Number(p.scale.toFixed(2)),
      o: Number(p.opacity.toFixed(2)),
      c: p.colorIndex
    }))
  }

  const hash = btoa(encodeURIComponent(JSON.stringify(config)))
  const baseUrl = window.location.origin + window.location.pathname
  return `${baseUrl}#${hash}`
}

export function parseShareURL(): { patterns: PatternConfig[]; themeIndex: number } | null {
  const hash = window.location.hash.slice(1)
  if (!hash) return null

  try {
    const decoded = decodeURIComponent(atob(hash))
    const config = JSON.parse(decoded)

    const patterns: PatternConfig[] = config.p.map((p: any) => ({
      id: p.i,
      type: p.ty,
      x: p.x,
      y: p.y,
      rotation: p.r,
      scale: p.s,
      opacity: p.o,
      colorIndex: p.c
    }))

    return { patterns, themeIndex: config.t }
  } catch {
    return null
  }
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text)
    .then(() => true)
    .catch(() => false)
}
