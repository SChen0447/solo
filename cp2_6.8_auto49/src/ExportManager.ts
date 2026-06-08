import type { AsciiMatrix } from './ImageProcessor'

const FONT_FAMILY = '"Source Code Pro", monospace'
const FONT_SIZE = 14
const CHAR_WIDTH = 8.4
const CHAR_HEIGHT = 16
const LINE_HEIGHT = 16

export function asciiMatrixToText(matrix: AsciiMatrix): string {
  return matrix.cells.map(row => row.map(cell => cell.char).join('')).join('\n')
}

export function asciiMatrixToSvg(matrix: AsciiMatrix, colored: boolean = false): string {
  const width = matrix.width * CHAR_WIDTH
  const height = matrix.height * LINE_HEIGHT

  let textElements = ''
  for (let y = 0; y < matrix.height; y++) {
    const row = matrix.cells[y]
    let currentX = 0
    let currentColor: string | null = null
    let currentText = ''

    const flushSpan = () => {
      if (currentText) {
        const fill = colored && currentColor ? currentColor : '#ffffff'
        textElements += `<text x="${currentX}" y="${(y + 1) * LINE_HEIGHT - 2}" ` +
          `font-family="${FONT_FAMILY}" font-size="${FONT_SIZE}" ` +
          `font-weight="400" fill="${fill}" text-rendering="geometricPrecision">` +
          `${escapeXml(currentText)}</text>`
      }
    }

    for (let x = 0; x < matrix.width; x++) {
      const cell = row[x]
      const color = cell.color || null

      if (colored && color !== currentColor && currentText) {
        flushSpan()
        currentText = ''
        currentX = x * CHAR_WIDTH
      }

      if (!currentText) {
        currentX = x * CHAR_WIDTH
        currentColor = color
      }

      currentText += cell.char
    }

    flushSpan()
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}" ` +
    `preserveAspectRatio="xMidYMid meet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600;700&amp;display=swap');
  </style>
  <rect width="100%" height="100%" fill="#1a1a2e"/>
  <g font-family="${FONT_FAMILY}" font-size="${FONT_SIZE}">
${textElements}
  </g>
</svg>`
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportAsText(matrix: AsciiMatrix, filename: string = 'ascii-art.txt'): void {
  const text = asciiMatrixToText(matrix)
  downloadFile(text, filename, 'text/plain;charset=utf-8')
}

export function exportAsSvg(
  matrix: AsciiMatrix,
  colored: boolean = false,
  filename: string = 'ascii-art.svg',
  onProgress?: (percent: number) => void
): void {
  const totalChars = matrix.width * matrix.height
  let processed = 0

  const generateSvg = (): string => {
    const width = matrix.width * CHAR_WIDTH
    const height = matrix.height * LINE_HEIGHT

    let textElements = ''
    for (let y = 0; y < matrix.height; y++) {
      const row = matrix.cells[y]
      for (let x = 0; x < matrix.width; x++) {
        const cell = row[x]
        const fill = colored && cell.color ? cell.color : '#ffffff'
        textElements += `<text x="${x * CHAR_WIDTH}" y="${(y + 1) * LINE_HEIGHT - 2}" ` +
          `font-family="${FONT_FAMILY}" font-size="${FONT_SIZE}" ` +
          `fill="${fill}">${escapeXml(cell.char)}</text>`

        processed++
        if (onProgress && processed % 500 === 0) {
          const percent = Math.round((processed / totalChars) * 100)
          setTimeout(() => onProgress(Math.min(percent, 100)), 0)
        }
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" ` +
      `width="${width}" height="${height}" ` +
      `viewBox="0 0 ${width} ${height}" ` +
      `preserveAspectRatio="xMidYMid meet">
  <rect width="100%" height="100%" fill="#1a1a2e"/>
${textElements}
</svg>`
  }

  const svg = generateSvg()
  if (onProgress) {
    onProgress(100)
  }
  downloadFile(svg, filename, 'image/svg+xml')
}

export function getSvgSizeEstimate(matrix: AsciiMatrix, colored: boolean): number {
  const textSize = asciiMatrixToText(matrix).length
  const avgSvgOverhead = colored ? 2.8 : 2.2
  return Math.round(textSize * avgSvgOverhead)
}
