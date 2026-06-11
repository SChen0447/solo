import { useRef, useEffect, useMemo, useCallback } from 'react'
import {
  FieldSample,
  Building,
  Vec2,
  STREET_WIDTH,
  STREET_DEPTH,
  GRID_SIZE,
  CELL_SPACING
} from '../types'

export interface AcousticMap2DProps {
  heatmapData: FieldSample[]
  buildings: Building[]
  probePosition: Vec2 | null
  onProbePositionChange: (pos: Vec2 | null) => void
  width: number
  height: number
}

function splToColor(spl: number): [number, number, number] {
  if (spl < 0) return [0, 0, 0]
  const t = Math.max(0, Math.min(1, (spl - 40) / 80))
  if (t < 0.25) {
    const r = t / 0.25
    return [
      Math.round(26 + r * (0 - 26)),
      Math.round(0 + r * (61 - 0)),
      Math.round(48 + r * (107 - 48))
    ]
  } else if (t < 0.5) {
    const r = (t - 0.25) / 0.25
    return [
      Math.round(0 + r * (140 - 0)),
      Math.round(61 + r * (191 - 61)),
      Math.round(107 + r * (63 - 107))
    ]
  } else if (t < 0.75) {
    const r = (t - 0.5) / 0.25
    return [
      Math.round(140 + r * (255 - 140)),
      Math.round(191 + r * (215 - 191)),
      Math.round(63 + r * (0 - 63))
    ]
  } else {
    const r = (t - 0.75) / 0.25
    return [255, 215, 0]
  }
}

export default function AcousticMap2D(props: AcousticMap2DProps) {
  const { heatmapData, buildings, probePosition, onProbePositionChange, width, height } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragState = useRef<{ dragging: boolean }>({ dragging: false })

  const worldToCanvas = useCallback((wx: number, wz: number): [number, number] => {
    const cx = width / 2 + (wx / STREET_WIDTH) * width
    const cy = height / 2 + (wz / STREET_DEPTH) * height
    return [cx, cy]
  }, [width, height])

  const canvasToWorld = useCallback((cx: number, cy: number): Vec2 => {
    const wx = ((cx - width / 2) / width) * STREET_WIDTH
    const wz = ((cy - height / 2) / height) * STREET_DEPTH
    return { x: wx, z: wz }
  }, [width, height])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, width, height)

    const cellW = (CELL_SPACING / STREET_WIDTH) * width * 1.02
    const cellH = (CELL_SPACING / STREET_DEPTH) * height * 1.02

    for (let ix = 0; ix < GRID_SIZE; ix++) {
      for (let iz = 0; iz < GRID_SIZE; iz++) {
        const sample = heatmapData[ix * GRID_SIZE + iz]
        if (!sample) continue
        const [cx, cy] = worldToCanvas(sample.position.x, sample.position.z)
        if (sample.soundPressureLevel < 0) continue
        const [r, g, b] = splToColor(sample.soundPressureLevel)
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`
        ctx.fillRect(cx - cellW / 2, cy - cellH / 2, cellW, cellH)
      }
    }

    ctx.strokeStyle = 'rgba(74, 90, 106, 0.4)'
    ctx.lineWidth = 1
    for (let x = 0; x <= 6; x++) {
      const cx = (x / 6) * width
      ctx.beginPath()
      ctx.moveTo(cx, 0)
      ctx.lineTo(cx, height)
      ctx.stroke()
    }
    for (let z = 0; z <= 4; z++) {
      const cz = (z / 4) * height
      ctx.beginPath()
      ctx.moveTo(0, cz)
      ctx.lineTo(width, cz)
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(0, 188, 212, 0.9)'
    ctx.lineWidth = 2
    for (const b of buildings) {
      ctx.save()
      const [bcx, bcy] = worldToCanvas(b.position.x, b.position.z)
      ctx.translate(bcx, bcy)
      ctx.rotate((b.rotation * Math.PI) / 180)
      const bw = (b.dimensions.width / STREET_WIDTH) * width
      const bd = (b.dimensions.depth / STREET_DEPTH) * height
      ctx.fillStyle = 'rgba(60, 70, 80, 0.85)'
      ctx.fillRect(-bw / 2, -bd / 2, bw, bd)
      ctx.strokeRect(-bw / 2, -bd / 2, bw, bd)
      ctx.restore()
    }

    if (probePosition) {
      const [pcx, pcy] = worldToCanvas(probePosition.x, probePosition.z)
      ctx.save()
      ctx.strokeStyle = '#00bcd4'
      ctx.fillStyle = 'rgba(0, 188, 212, 0.3)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(pcx, pcy, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(pcx, pcy, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#00bcd4'
      ctx.fill()
      ctx.restore()
    }

  }, [heatmapData, buildings, probePosition, width, height, worldToCanvas])

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    dragState.current.dragging = true
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    onProbePositionChange(canvasToWorld(cx, cy))
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragState.current.dragging) return
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    onProbePositionChange(canvasToWorld(cx, cy))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragState.current.dragging = false
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'rgba(11, 26, 46, 0.4)',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid rgba(0, 188, 212, 0.2)'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        fontSize: '11px',
        color: '#00bcd4',
        background: 'rgba(0,0,0,0.5)',
        padding: '2px 6px',
        borderRadius: '3px'
      }}>
        声场热力图 / Acoustic Heatmap
      </div>
      <LegendBar />
    </div>
  )
}

function LegendBar() {
  const items = [
    { color: '#1a0030', label: '<60' },
    { color: '#003d6b', label: '60-80' },
    { color: '#8cbf3f', label: '80-100' },
    { color: '#ffd700', label: '100+' }
  ]
  return (
    <div style={{
      position: 'absolute',
      bottom: '8px',
      right: '8px',
      display: 'flex',
      gap: '4px',
      background: 'rgba(0,0,0,0.5)',
      padding: '4px 6px',
      borderRadius: '4px',
      alignItems: 'center'
    }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <div style={{
            width: '16px', height: '10px',
            background: it.color,
            borderRadius: '2px',
            border: '1px solid rgba(255,255,255,0.1)'
          }} />
          <span style={{ fontSize: '10px', color: '#e0e0e0' }}>{it.label}dB</span>
        </div>
      ))}
    </div>
  )
}
