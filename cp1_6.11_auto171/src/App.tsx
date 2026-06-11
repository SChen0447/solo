import { useState, useRef, useEffect, useCallback } from 'react'
import { gsap } from 'gsap'
import { saveAs } from 'file-saver'
import ControlsPanel from './ControlsPanel'
import { KaleidoscopeRenderer, type ShapeType, type ColorTheme, type RenderParams } from './KaleidoscopeCanvas'

interface RgbColor {
  r: number
  g: number
  b: number
}

function hexToRgb(hex: string): RgbColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

const colorThemes = {
  aurora: { color1: '#00ff87', color2: '#60efff', color3: '#7b2ffc', color4: '#d946ef' },
  warm: { color1: '#ff6b35', color2: '#f7c59f', color3: '#c1121f', color4: '#780000' },
  cool: { color1: '#023e8a', color2: '#0096c7', color3: '#480ca8', color4: '#4cc9f0' },
  rainbow: { color1: '#ff0000', color2: '#ff8800', color3: '#ffff00', color4: '#ff00ff' }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<KaleidoscopeRenderer | null>(null)
  const animationRef = useRef<number | null>(null)
  const angleProxyRef = useRef({ value: 0 })
  const colorProxyRef = useRef({
    c1r: 0, c1g: 255, c1b: 135,
    c2r: 96, c2g: 239, c2b: 255,
    c3r: 123, c3g: 47, c3b: 252,
    c4r: 217, c4g: 70, c4b: 239
  })

  const [angle, setAngle] = useState(0)
  const [shape, setShape] = useState<ShapeType>('triangle')
  const [theme, setTheme] = useState<ColorTheme>('aurora')
  const [colorPalette, setColorPalette] = useState({
    color1: '#00ff87',
    color2: '#60efff',
    color3: '#7b2ffc',
    color4: '#d946ef'
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new KaleidoscopeRenderer(canvas)
    rendererRef.current = renderer

    const resize = () => {
      const container = canvas.parentElement
      if (container) {
        const size = Math.min(container.clientWidth - 40, container.clientHeight - 40)
        canvas.width = size
        canvas.height = size
      }
    }
    resize()
    window.addEventListener('resize', resize)

    angleProxyRef.current.value = angle

    const renderLoop = () => {
      const cp = colorProxyRef.current
      const currentColors = [
        rgbToHex(cp.c1r, cp.c1g, cp.c1b),
        rgbToHex(cp.c2r, cp.c2g, cp.c2b),
        rgbToHex(cp.c3r, cp.c3g, cp.c3b),
        rgbToHex(cp.c4r, cp.c4g, cp.c4b)
      ]
      const params: RenderParams = {
        angle: angleProxyRef.current.value,
        shape,
        colors: currentColors
      }
      renderer.render(params)
      animationRef.current = requestAnimationFrame(renderLoop)
    }
    renderLoop()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [shape])

  useEffect(() => {
    gsap.to(angleProxyRef.current, {
      value: angle,
      duration: 0.4,
      ease: 'power2.out'
    })
  }, [angle])

  useEffect(() => {
    const targetColors = colorThemes[theme]
    const c1 = hexToRgb(targetColors.color1)
    const c2 = hexToRgb(targetColors.color2)
    const c3 = hexToRgb(targetColors.color3)
    const c4 = hexToRgb(targetColors.color4)

    gsap.to(colorProxyRef.current, {
      c1r: c1.r, c1g: c1.g, c1b: c1.b,
      c2r: c2.r, c2g: c2.g, c2b: c2.b,
      c3r: c3.r, c3g: c3.g, c3b: c3.b,
      c4r: c4.r, c4g: c4.g, c4b: c4.b,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => {
        const cp = colorProxyRef.current
        setColorPalette({
          color1: rgbToHex(cp.c1r, cp.c1g, cp.c1b),
          color2: rgbToHex(cp.c2r, cp.c2g, cp.c2b),
          color3: rgbToHex(cp.c3r, cp.c3g, cp.c3b),
          color4: rgbToHex(cp.c4r, cp.c4g, cp.c4b)
        })
      }
    })
  }, [theme])

  const handleAngleChange = useCallback((newAngle: number) => {
    setAngle(newAngle)
  }, [])

  const handleShapeChange = useCallback((newShape: ShapeType) => {
    setShape(newShape)
  }, [])

  const handleThemeChange = useCallback((newTheme: ColorTheme) => {
    setTheme(newTheme)
  }, [])

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !rendererRef.current) return

    const exportCanvas = document.createElement('canvas')
    const exportSize = Math.min(canvas.width, canvas.height) * 2
    exportCanvas.width = exportSize
    exportCanvas.height = exportSize

    const cp = colorProxyRef.current
    const currentColors = [
      rgbToHex(cp.c1r, cp.c1g, cp.c1b),
      rgbToHex(cp.c2r, cp.c2g, cp.c2b),
      rgbToHex(cp.c3r, cp.c3g, cp.c3b),
      rgbToHex(cp.c4r, cp.c4g, cp.c4b)
    ]

    const tempRenderer = new KaleidoscopeRenderer(exportCanvas)
    const params: RenderParams = {
      angle: angleProxyRef.current.value,
      shape,
      colors: currentColors
    }
    tempRenderer.render(params)

    exportCanvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, `kaleidoscope-${Date.now()}.png`)
      }
    }, 'image/png', 1.0)
  }, [shape])

  return (
    <div className="app-container">
      <div className="canvas-wrapper">
        <div className="canvas-glow" />
        <canvas ref={canvasRef} className="kaleidoscope-canvas" />
      </div>
      <ControlsPanel
        angle={angle}
        shape={shape}
        theme={theme}
        onAngleChange={handleAngleChange}
        onShapeChange={handleShapeChange}
        onThemeChange={handleThemeChange}
        onExport={handleExport}
      />
    </div>
  )
}
